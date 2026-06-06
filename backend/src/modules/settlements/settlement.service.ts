import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { assertCenterAccess, buildCenterWhereClause } from '../../utils/centerAccess';
import type { CreateSettlementDto, CreateBatchSettlementDto, SettlementFiltersDto } from './settlement.dto';

const settlementInclude = {
  center: true,
  user: {
    select: {
      id: true,
      username: true,
    },
  },
  approver: {
    select: {
      id: true,
      username: true,
    },
  },
};

type SettlementWithRelations = Prisma.SettlementGetPayload<{ include: typeof settlementInclude }>;

type BatchGroup = {
  type: 'batch';
  batchId: string;
  centerId: string;
  centerName: string;
  startDate: string;
  endDate: string;
  count: number;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  carryForwardAmount: number;
  settledAmount: number;
  remainingAmount: number;
  finalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  days: { date: string; netAmount: number; settledAmount: number }[];
};

export type SettlementListItem =
  | ({ type: 'individual' } & SettlementWithRelations)
  | BatchGroup;

// Reusable helper: aggregate income and expenses for one calendar day
async function aggregateDayFinancials(centerId: string, date: Date) {
  // transactionDate/expenseDate are @db.Date (date-only). Build the day window in UTC
  // so the date part stays correct regardless of server timezone (a local-midnight
  // window in IST shifts to the previous day and wrongly pulls in its records).
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

  const directCash = await prisma.transaction.aggregate({
    where: { centerId, transactionDate: { gte: start, lte: end }, paymentMode: 'CASH' },
    _sum: { amount: true },
  });
  const splitCash = await prisma.transactionPayment.aggregate({
    where: {
      paymentMode: 'CASH',
      transaction: { centerId, transactionDate: { gte: start, lte: end }, paymentMode: 'SPLIT' },
    },
    _sum: { amount: true },
  });
  const totalIncome =
    (directCash._sum.amount?.toNumber() ?? 0) + (splitCash._sum.amount?.toNumber() ?? 0);

  const expenseAgg = await prisma.expense.aggregate({
    where: { centerId, expenseDate: { gte: start, lte: end }, status: 'APPROVED' },
    _sum: { amount: true },
  });
  const totalExpenses = expenseAgg._sum.amount?.toNumber() ?? 0;
  return { totalIncome, totalExpenses, netAmount: totalIncome - totalExpenses };
}

export class SettlementService {
  private aggregateBatchGroup(records: SettlementWithRelations[]): BatchGroup {
    const sorted = [...records].sort(
      (a, b) => new Date(a.settlementDate).getTime() - new Date(b.settlementDate).getTime()
    );
    const toDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    return {
      type: 'batch',
      batchId: sorted[0].batchId!,
      centerId: sorted[0].centerId,
      centerName: sorted[0].center?.centerName ?? '',
      startDate: toDateStr(new Date(sorted[0].settlementDate)),
      endDate: toDateStr(new Date(sorted[sorted.length - 1].settlementDate)),
      count: sorted.length,
      totalIncome: sorted.reduce((s, r) => s + Number(r.totalIncome), 0),
      totalExpenses: sorted.reduce((s, r) => s + Number(r.totalExpenses), 0),
      netAmount: sorted.reduce((s, r) => s + Number(r.netAmount), 0),
      // Carry-forward is a per-batch concept: it enters once (the first day's
      // carry-in) and the days chain it internally so the last day's remaining
      // accumulates the full outstanding balance. Summing finalAmount /
      // remainingAmount across the rows would double-count that internal carry
      // (e.g. Jun 2's unpaid ₹40 appears again as Jun 3's carry-in), so the
      // batch final = Σ net + batch carry-in, and outstanding = last day's remaining.
      carryForwardAmount: Number(sorted[0].carryForwardAmount),
      settledAmount: sorted.reduce((s, r) => s + Number(r.settledAmount), 0),
      remainingAmount: Number(sorted[sorted.length - 1].remainingAmount),
      finalAmount:
        sorted.reduce((s, r) => s + Number(r.netAmount), 0) +
        Number(sorted[0].carryForwardAmount),
      status: sorted.some((r) => r.status === 'PENDING')
        ? 'PENDING'
        : sorted.every((r) => r.status === 'APPROVED')
        ? 'APPROVED'
        : 'REJECTED',
      createdAt: sorted[sorted.length - 1].createdAt.toISOString(),
      days: sorted.map((r) => ({
        date: toDateStr(new Date(r.settlementDate)),
        netAmount: Number(r.netAmount),
        settledAmount: Number(r.settledAmount),
      })),
    };
  }

  async preview(userId: string, role: string, centerId: string, settlementDate: string) {
    await assertCenterAccess(userId, role, centerId);
    return aggregateDayFinancials(centerId, new Date(settlementDate));
  }

  async create(userId: string, role: string, dto: CreateSettlementDto) {
    await assertCenterAccess(userId, role, dto.centerId);
    const settlementDate = new Date(dto.settlementDate);
    // Use UTC-aware day boundaries (independent of server TZ) so @db.Date queries work correctly.
    // Date-only strings are parsed as UTC midnight; construct boundaries in UTC, not local TZ.
    const startOfDay = new Date(
      Date.UTC(settlementDate.getUTCFullYear(), settlementDate.getUTCMonth(), settlementDate.getUTCDate(), 0, 0, 0, 0)
    );
    const endOfDay = new Date(
      Date.UTC(settlementDate.getUTCFullYear(), settlementDate.getUTCMonth(), settlementDate.getUTCDate(), 23, 59, 59, 999)
    );
    const newDay = new Date(
      Date.UTC(settlementDate.getUTCFullYear(), settlementDate.getUTCMonth(), settlementDate.getUTCDate(), 0, 0, 0, 0)
    );

    // Carry-forward anchors on the last APPROVED settlement only
    const lastApproved = await prisma.settlement.findFirst({
      where: { centerId: dto.centerId, status: 'APPROVED' },
      orderBy: { settlementDate: 'desc' },
    });
    const carryForwardAmount = lastApproved ? Number(lastApproved.remainingAmount) : 0;

    // Block while a settlement after the last approved is still PENDING
    const pending = await prisma.settlement.findFirst({
      where: {
        centerId: dto.centerId,
        status: 'PENDING',
        ...(lastApproved ? { settlementDate: { gt: lastApproved.settlementDate } } : {}),
      },
      orderBy: { settlementDate: 'asc' },
    });
    if (pending) {
      throw ApiError.badRequest(
        `Settlement for ${pending.settlementDate.toISOString().slice(0, 10)} is pending approval. Approve or reject it before creating a new one.`
      );
    }

    // Determine the window start (first settleable / re-settleable date)
    let windowStartDate: Date | null;
    if (lastApproved) {
      windowStartDate = new Date(lastApproved.settlementDate);
      windowStartDate.setHours(0, 0, 0, 0);
      windowStartDate.setDate(windowStartDate.getDate() + 1);
    } else {
      const earliest = await prisma.settlement.findFirst({
        where: { centerId: dto.centerId },
        orderBy: { settlementDate: 'asc' },
      });
      if (earliest) {
        windowStartDate = new Date(earliest.settlementDate);
        windowStartDate.setHours(0, 0, 0, 0);
      } else {
        windowStartDate = null;
      }
    }

    if (windowStartDate) {
      if (newDay.getTime() < windowStartDate.getTime()) {
        throw ApiError.badRequest('Cannot settle a date on or before an already-approved settlement.');
      }
      if (newDay.getTime() > windowStartDate.getTime()) {
        throw ApiError.badRequest('There are earlier unsettled or rejected days. Settle them first — use batch creation.');
      }
    }

    // Existing record on the requested date: replace only if REJECTED
    const existing = await prisma.settlement.findFirst({
      where: { centerId: dto.centerId, settlementDate: { gte: startOfDay, lte: endOfDay } },
    });
    if (existing && existing.status !== 'REJECTED') {
      throw ApiError.conflict('A settlement already exists for this center on this date');
    }
    const rejectedToReplaceId = existing && existing.status === 'REJECTED' ? existing.id : null;

    const { totalIncome, totalExpenses, netAmount } = await aggregateDayFinancials(
      dto.centerId,
      settlementDate
    );
    const finalAmount = netAmount + carryForwardAmount;
    const settledAmount =
      dto.settledAmount !== undefined ? Math.min(dto.settledAmount, finalAmount) : finalAmount;
    const remainingAmount = finalAmount - settledAmount;
    const settlementNumber = `SET${Date.now()}${randomUUID().slice(0, 8)}`;

    const settlement = await prisma
      .$transaction(async (tx) => {
        if (rejectedToReplaceId) {
          await tx.settlement.delete({ where: { id: rejectedToReplaceId } });
        }
        return tx.settlement.create({
          data: {
            settlementNumber,
            centerId: dto.centerId,
            userId,
            settlementDate,
            totalIncome,
            totalExpenses,
            netAmount,
            carryForwardAmount,
            finalAmount,
            settledAmount,
            remainingAmount,
            status: 'PENDING',
            notes: dto.notes,
          },
          include: settlementInclude,
        });
      })
      .catch((err: { code?: string }) => {
        if (err.code === 'P2002') {
          throw ApiError.conflict('A settlement already exists for this center on this date');
        }
        throw err;
      });

    return settlement;
  }

  async batchPreview(userId: string, role: string, centerId: string, endDate: string) {
    await assertCenterAccess(userId, role, centerId);

    const endDateObj = new Date(endDate);
    // UTC-aware boundaries: avoid server TZ reinterpretation via setHours()
    const endMidnight = new Date(
      Date.UTC(endDateObj.getUTCFullYear(), endDateObj.getUTCMonth(), endDateObj.getUTCDate(), 0, 0, 0, 0)
    );

    const today = new Date();
    const todayEnd = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999)
    );
    if (endMidnight > todayEnd) {
      throw ApiError.badRequest('Cannot create settlements for future dates');
    }

    const lastApproved = await prisma.settlement.findFirst({
      where: { centerId, status: 'APPROVED' },
      orderBy: { settlementDate: 'desc' },
    });

    // Block while a settlement after the last approved is still PENDING
    const pending = await prisma.settlement.findFirst({
      where: {
        centerId,
        status: 'PENDING',
        ...(lastApproved ? { settlementDate: { gt: lastApproved.settlementDate } } : {}),
      },
      orderBy: { settlementDate: 'asc' },
    });
    if (pending) {
      throw ApiError.badRequest(
        `Settlement for ${pending.settlementDate.toISOString().slice(0, 10)} is pending approval. Approve or reject it before creating a new one.`
      );
    }

    let startDateObj: Date;
    let initialCarryForward: number;

    if (lastApproved) {
      // Start from day after the last approved settlement (UTC-aware)
      const lastDate = lastApproved.settlementDate;
      const nextDayMs = new Date(
        Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth(), lastDate.getUTCDate() + 1, 0, 0, 0, 0)
      ).getTime();
      startDateObj = new Date(nextDayMs);
      initialCarryForward = Number(lastApproved.remainingAmount);
    } else {
      const earliest = await prisma.settlement.findFirst({
        where: { centerId },
        orderBy: { settlementDate: 'asc' },
      });
      if (earliest) {
        // If there are settlements, start from the earliest (UTC-aware)
        startDateObj = new Date(
          Date.UTC(earliest.settlementDate.getUTCFullYear(), earliest.settlementDate.getUTCMonth(), earliest.settlementDate.getUTCDate(), 0, 0, 0, 0)
        );
      } else {
        // No settlements: start from endMidnight
        startDateObj = endMidnight;
      }
      initialCarryForward = 0;
    }

    if (startDateObj > endMidnight) {
      return [];
    }

    // Iterate days using UTC-safe arithmetic
    const days: Date[] = [];
    const cursorMs = startDateObj.getTime();
    const endMs = endMidnight.getTime();
    for (let ms = cursorMs; ms <= endMs; ms += 86400000) { // 86400000 ms = 1 day
      days.push(new Date(ms));
    }

    // Build range boundaries for bulk queries (UTC-aware)
    const rangeStart = days[0] || endMidnight;
    const rangeEnd = new Date(
      Date.UTC((days[days.length - 1] || endMidnight).getUTCFullYear(), (days[days.length - 1] || endMidnight).getUTCMonth(), (days[days.length - 1] || endMidnight).getUTCDate(), 23, 59, 59, 999)
    );

    // Fetch all data in 3 bulk queries instead of 3×N sequential queries
    const [directCashTx, splitCashPay, expenseRows] = await Promise.all([
      prisma.transaction.findMany({
        where: { centerId, transactionDate: { gte: rangeStart, lte: rangeEnd }, paymentMode: 'CASH' },
        select: { transactionDate: true, amount: true },
      }),
      prisma.transactionPayment.findMany({
        where: {
          paymentMode: 'CASH',
          transaction: { centerId, transactionDate: { gte: rangeStart, lte: rangeEnd }, paymentMode: 'SPLIT' },
        },
        select: { amount: true, transaction: { select: { transactionDate: true } } },
      }),
      prisma.expense.findMany({
        where: { centerId, expenseDate: { gte: rangeStart, lte: rangeEnd }, status: 'APPROVED' },
        select: { expenseDate: true, amount: true },
      }),
    ]);

    // Helper: return YYYY-MM-DD string using local timezone (matches setHours day boundaries)
    const localDateKey = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // Bucket all records by their local calendar day
    const incomeByDay = new Map<string, number>();
    const expensesByDay = new Map<string, number>();

    for (const tx of directCashTx) {
      const key = localDateKey(new Date(tx.transactionDate));
      incomeByDay.set(key, (incomeByDay.get(key) ?? 0) + tx.amount.toNumber());
    }
    for (const pay of splitCashPay) {
      const key = localDateKey(new Date(pay.transaction.transactionDate));
      incomeByDay.set(key, (incomeByDay.get(key) ?? 0) + pay.amount.toNumber());
    }
    for (const exp of expenseRows) {
      const key = localDateKey(new Date(exp.expenseDate));
      expensesByDay.set(key, (expensesByDay.get(key) ?? 0) + exp.amount.toNumber());
    }

    let runningCarryForward = initialCarryForward;
    const results: {
      date: string;
      totalIncome: number;
      totalExpenses: number;
      netAmount: number;
      carryForwardAmount: number;
      finalAmount: number;
    }[] = [];

    for (const day of days) {
      const dateKey = localDateKey(day);
      const totalIncome = incomeByDay.get(dateKey) ?? 0;
      const totalExpenses = expensesByDay.get(dateKey) ?? 0;
      const netAmount = totalIncome - totalExpenses;
      const carryForwardAmount = runningCarryForward;
      const finalAmount = netAmount + carryForwardAmount;

      results.push({ date: dateKey, totalIncome, totalExpenses, netAmount, carryForwardAmount, finalAmount });

      // Each day in batch is fully settled — next carry-forward is 0
      runningCarryForward = 0;
    }

    return results;
  }

  async createBatch(userId: string, role: string, dto: CreateBatchSettlementDto) {
    await assertCenterAccess(userId, role, dto.centerId);

    const days = await this.batchPreview(userId, role, dto.centerId, dto.endDate);

    if (days.length === 0) {
      throw ApiError.badRequest('No pending days to settle for this date range');
    }

    // Distribute payment greedily oldest-to-newest, chaining the carry-forward through the
    // days: each day's carry-forward is the previous day's remaining balance. This keeps
    // the per-record invariant `settledAmount + remainingAmount = finalAmount` intact for
    // every day, while the last day's remaining naturally equals the total outstanding
    // (which becomes the carry-forward into the next settlement).
    const initialCarry = days[0].carryForwardAmount;
    const totalFinal = days.reduce((sum, d) => sum + d.finalAmount, 0);
    const maxSettleable = Math.max(totalFinal, 0);
    const targetSettled =
      dto.settledAmount !== undefined
        ? Math.min(dto.settledAmount, maxSettleable)
        : totalFinal;
    let budget = targetSettled;
    let carry = initialCarry;
    const batchId = randomUUID();

    // Write all settlements in one transaction; skip includes to keep it fast,
    // then fetch the full records with relations after commit.
    const createdIds = await prisma.$transaction(
      async (tx) => {
        // Re-settle: remove any rejected settlements in this range so they can be recreated
        await tx.settlement.deleteMany({
          where: {
            centerId: dto.centerId,
            status: 'REJECTED',
            settlementDate: {
              gte: new Date(days[0].date),
              lte: new Date(days[days.length - 1].date),
            },
          },
        });
        const ids: string[] = [];
        for (let i = 0; i < days.length; i++) {
          const day = days[i];
          const settlementDate = new Date(day.date);
          const settlementNumber = `SET${day.date.replace(/-/g, '')}${Date.now()}${i}`;

          const dayCarry = carry;
          const finalAmount = day.netAmount + dayCarry;
          const settledAmount = Math.max(0, Math.min(budget, finalAmount));
          const remainingAmount = finalAmount - settledAmount;
          budget = Math.max(0, budget - settledAmount);
          carry = remainingAmount; // rolls forward to the next day

          const { id } = await tx.settlement.create({
            data: {
              settlementNumber,
              centerId: dto.centerId,
              userId,
              settlementDate,
              totalIncome: day.totalIncome,
              totalExpenses: day.totalExpenses,
              netAmount: day.netAmount,
              carryForwardAmount: dayCarry,
              finalAmount,
              settledAmount,
              remainingAmount,
              status: 'PENDING',
              batchId,
              notes: dto.notes,
            },
            select: { id: true },
          });
          ids.push(id);
        }
        return ids;
      },
      { timeout: 30000 }
    ).catch((err: { code?: string; message?: string }) => {
      if (err.code === 'P2002') {
        throw ApiError.conflict('One or more days in the batch already have settlements. Please refresh and try again.');
      }
      throw err;
    });

    const settlements = await prisma.settlement.findMany({
      where: { id: { in: createdIds } },
      include: settlementInclude,
      orderBy: { settlementDate: 'asc' },
    });

    return settlements;
  }

  async findAll(userId: string, role: string, filters: SettlementFiltersDto) {
    const { centerId, status, startDate, endDate, search, sortBy, sortOrder, page, limit, flat } = filters;

    const where: Record<string, unknown> = {
      ...(await buildCenterWhereClause(userId, role, centerId)),
    };

    if (status) where.status = status;
    if (startDate && endDate) {
      where.settlementDate = { gte: new Date(startDate), lte: new Date(endDate) };
    } else if (startDate) {
      where.settlementDate = { gte: new Date(startDate) };
    } else if (endDate) {
      where.settlementDate = { lte: new Date(endDate) };
    }
    if (search) where.settlementNumber = { contains: search };

    const [rawData, total] = await Promise.all([
      prisma.settlement.findMany({
        where,
        include: settlementInclude,
        orderBy: [{ [sortBy]: sortOrder }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.settlement.count({ where }),
    ]);

    // Flat mode (reports): return every settlement as its own row, no batch grouping
    if (flat === 'true') {
      return {
        data: rawData.map((s) => ({ type: 'individual' as const, ...s })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // Collect distinct batchIds on this page
    const batchIds = [
      ...new Set(rawData.filter((s) => s.batchId).map((s) => s.batchId as string)),
    ];

    // Fetch all settlements belonging to those batchIds (may include off-page records)
    const batchGroupMap = new Map<string, SettlementWithRelations[]>();
    if (batchIds.length > 0) {
      const allBatchRecords = await prisma.settlement.findMany({
        where: { batchId: { in: batchIds } },
        include: settlementInclude,
        orderBy: { settlementDate: 'desc' },
      });
      for (const record of allBatchRecords) {
        if (!record.batchId) continue;
        const list = batchGroupMap.get(record.batchId) ?? [];
        list.push(record);
        batchGroupMap.set(record.batchId, list);
      }
    }

    // Build result: show batch group on the page where the most-recent member appears
    const pageIds = new Set(rawData.map((s) => s.id));
    const emittedBatchIds = new Set<string>();
    const data: SettlementListItem[] = [];

    for (const s of rawData) {
      if (!s.batchId) {
        data.push({ type: 'individual', ...s });
      } else if (!emittedBatchIds.has(s.batchId)) {
        const batchRecords = batchGroupMap.get(s.batchId) ?? [];
        // batchRecords sorted desc; [0] is the most-recent settlement (the anchor)
        const anchor = batchRecords[0];
        if (anchor && pageIds.has(anchor.id)) {
          data.push(this.aggregateBatchGroup(batchRecords));
          emittedBatchIds.add(s.batchId);
        }
        // anchor not on this page = batch was shown on an earlier page, skip
      }
      // duplicate batchId on same page = skip (already emitted)
    }

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, userId: string, role: string) {
    const settlement = await prisma.settlement.findUnique({
      where: { id },
      include: settlementInclude,
    });
    if (!settlement) throw ApiError.notFound('Settlement not found');
    await assertCenterAccess(userId, role, settlement.centerId);
    return settlement;
  }

  async approve(settlementId: string, adminId: string) {
    const settlement = await prisma.settlement.findUnique({ where: { id: settlementId } });
    if (!settlement) throw ApiError.notFound('Settlement not found');
    if (settlement.status !== 'PENDING') throw ApiError.badRequest('Settlement is not pending');
    return prisma.settlement.update({
      where: { id: settlementId },
      data: { status: 'APPROVED', approvedBy: adminId, approvedAt: new Date() },
      include: settlementInclude,
    });
  }

  async approveBatch(batchId: string, adminId: string): Promise<BatchGroup> {
    const records = await prisma.settlement.findMany({
      where: { batchId },
      include: settlementInclude,
    });
    if (records.length === 0) throw ApiError.notFound('Batch not found');
    const pendingIds = records.filter((r) => r.status === 'PENDING').map((r) => r.id);
    if (pendingIds.length === 0) throw ApiError.badRequest('No pending settlements in this batch');
    await prisma.settlement.updateMany({
      where: { id: { in: pendingIds } },
      data: { status: 'APPROVED', approvedBy: adminId, approvedAt: new Date() },
    });
    const updated = await prisma.settlement.findMany({
      where: { batchId },
      include: settlementInclude,
    });
    return this.aggregateBatchGroup(updated);
  }

  async rejectBatch(batchId: string, adminId: string, reason: string): Promise<BatchGroup> {
    const records = await prisma.settlement.findMany({
      where: { batchId },
      include: settlementInclude,
    });
    if (records.length === 0) throw ApiError.notFound('Batch not found');
    const pendingIds = records.filter((r) => r.status === 'PENDING').map((r) => r.id);
    if (pendingIds.length === 0) throw ApiError.badRequest('No pending settlements in this batch');
    await prisma.settlement.updateMany({
      where: { id: { in: pendingIds } },
      data: { status: 'REJECTED', approvedBy: adminId, approvedAt: new Date(), rejectionReason: reason },
    });
    const updated = await prisma.settlement.findMany({
      where: { batchId },
      include: settlementInclude,
    });
    return this.aggregateBatchGroup(updated);
  }

  async deleteBatch(batchId: string): Promise<string> {
    const records = await prisma.settlement.findMany({
      where: { batchId },
      orderBy: { settlementDate: 'desc' },
    });
    if (records.length === 0) throw ApiError.notFound('Batch not found');

    // Deleting an approved settlement that has later settlements would orphan the
    // carry-forward chain (downstream carry-forwards were snapshotted from it).
    if (records.some((r) => r.status === 'APPROVED')) {
      const later = await prisma.settlement.findFirst({
        where: { centerId: records[0].centerId, settlementDate: { gt: records[0].settlementDate } },
      });
      if (later) {
        throw ApiError.badRequest(
          'Cannot delete an approved batch that has later settlements. Delete the most recent settlements first.'
        );
      }
    }

    await prisma.settlement.deleteMany({ where: { batchId } });
    return batchId;
  }

  async reject(settlementId: string, adminId: string, reason: string) {
    const settlement = await prisma.settlement.findUnique({ where: { id: settlementId } });
    if (!settlement) throw ApiError.notFound('Settlement not found');
    if (settlement.status !== 'PENDING') throw ApiError.badRequest('Settlement is not pending');
    return prisma.settlement.update({
      where: { id: settlementId },
      data: { status: 'REJECTED', approvedBy: adminId, approvedAt: new Date(), rejectionReason: reason },
      include: settlementInclude,
    });
  }

  async deleteSettlement(id: string) {
    const settlement = await prisma.settlement.findUnique({ where: { id } });
    if (!settlement) throw ApiError.notFound('Settlement not found');

    // Deleting an approved settlement that has later settlements would orphan the
    // carry-forward chain (downstream carry-forwards were snapshotted from it).
    if (settlement.status === 'APPROVED') {
      const later = await prisma.settlement.findFirst({
        where: { centerId: settlement.centerId, settlementDate: { gt: settlement.settlementDate } },
      });
      if (later) {
        throw ApiError.badRequest(
          'Cannot delete an approved settlement that has later settlements. Delete the most recent settlement first.'
        );
      }
    }

    await prisma.settlement.delete({ where: { id } });
  }
}
