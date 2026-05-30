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

// Reusable helper: aggregate income and expenses for one calendar day
async function aggregateDayFinancials(centerId: string, date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

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
  async preview(userId: string, role: string, centerId: string, settlementDate: string) {
    await assertCenterAccess(userId, role, centerId);
    return aggregateDayFinancials(centerId, new Date(settlementDate));
  }

  async create(userId: string, role: string, dto: CreateSettlementDto) {
    await assertCenterAccess(userId, role, dto.centerId);
    const settlementDate = new Date(dto.settlementDate);
    const startOfDay = new Date(settlementDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(settlementDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.settlement.findFirst({
      where: {
        centerId: dto.centerId,
        settlementDate: { gte: startOfDay, lte: endOfDay },
      },
    });
    if (existing) {
      throw ApiError.conflict('A settlement already exists for this center on this date');
    }

    // Auto-compute carry-forward from the last settlement's remainingAmount
    const lastSettlement = await prisma.settlement.findFirst({
      where: { centerId: dto.centerId },
      orderBy: { settlementDate: 'desc' },
    });
    const carryForwardAmount = lastSettlement ? Number(lastSettlement.remainingAmount) : 0;

    // Enforce sequential creation: no gaps allowed
    if (lastSettlement) {
      const lastDate = new Date(lastSettlement.settlementDate);
      lastDate.setHours(0, 0, 0, 0);
      const expectedNext = new Date(lastDate);
      expectedNext.setDate(expectedNext.getDate() + 1);
      const newDay = new Date(settlementDate);
      newDay.setHours(0, 0, 0, 0);
      if (newDay.getTime() !== expectedNext.getTime()) {
        if (newDay < expectedNext) {
          throw ApiError.badRequest(
            'Cannot create a settlement for a date before or equal to an already settled date.'
          );
        }
        const pendingFrom = expectedNext.toISOString().slice(0, 10);
        throw ApiError.badRequest(
          `Pending settlements exist from ${pendingFrom}. Use batch creation to settle all pending days first.`
        );
      }
    }

    const { totalIncome, totalExpenses, netAmount } = await aggregateDayFinancials(
      dto.centerId,
      settlementDate
    );
    const finalAmount = netAmount + carryForwardAmount;
    const settledAmount =
      dto.settledAmount !== undefined ? Math.min(dto.settledAmount, finalAmount) : finalAmount;
    const remainingAmount = finalAmount - settledAmount;
    const settlementNumber = `SET${Date.now()}`;

    const settlement = await prisma.settlement.create({
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

    return settlement;
  }

  async batchPreview(userId: string, role: string, centerId: string, endDate: string) {
    await assertCenterAccess(userId, role, centerId);

    const endDateObj = new Date(endDate);
    endDateObj.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (endDateObj > today) {
      throw ApiError.badRequest('Cannot create settlements for future dates');
    }

    const lastSettlement = await prisma.settlement.findFirst({
      where: { centerId },
      orderBy: { settlementDate: 'desc' },
    });

    let startDateObj: Date;
    let initialCarryForward: number;

    if (lastSettlement) {
      startDateObj = new Date(lastSettlement.settlementDate);
      startDateObj.setHours(0, 0, 0, 0);
      startDateObj.setDate(startDateObj.getDate() + 1);
      initialCarryForward = Number(lastSettlement.remainingAmount);
    } else {
      startDateObj = new Date(endDateObj);
      initialCarryForward = 0;
    }

    if (startDateObj > endDateObj) {
      return [];
    }

    const days: Date[] = [];
    const cursor = new Date(startDateObj);
    while (cursor <= endDateObj) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    // Build range boundaries for bulk queries
    const rangeStart = new Date(days[0]);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(days[days.length - 1]);
    rangeEnd.setHours(23, 59, 59, 999);

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

    // Distribute settledAmount: all days except the last are fully settled;
    // the last day absorbs any partial payment so the remainder carries forward.
    const totalFinal = days.reduce((sum, d) => sum + d.finalAmount, 0);
    const maxSettleable = Math.max(totalFinal, 0);
    const targetSettled =
      dto.settledAmount !== undefined
        ? Math.min(dto.settledAmount, maxSettleable)
        : totalFinal;
    let remainingBudget = targetSettled;

    // Write all settlements in one transaction; skip includes to keep it fast,
    // then fetch the full records with relations after commit.
    const createdIds = await prisma.$transaction(
      async (tx) => {
        const ids: string[] = [];
        for (let i = 0; i < days.length; i++) {
          const day = days[i];
          const isLast = i === days.length - 1;
          const settlementDate = new Date(day.date);
          const settlementNumber = `SET${day.date.replace(/-/g, '')}${Date.now()}`;

          let settledAmount: number;
          let remainingAmount: number;
          if (!isLast) {
            settledAmount = Math.max(0, day.finalAmount);
            remainingAmount = 0;
            remainingBudget -= day.finalAmount;
          } else {
            settledAmount = Math.max(0, Math.min(remainingBudget, day.finalAmount));
            remainingAmount = day.finalAmount - settledAmount;
          }

          const { id } = await tx.settlement.create({
            data: {
              settlementNumber,
              centerId: dto.centerId,
              userId,
              settlementDate,
              totalIncome: day.totalIncome,
              totalExpenses: day.totalExpenses,
              netAmount: day.netAmount,
              carryForwardAmount: day.carryForwardAmount,
              finalAmount: day.finalAmount,
              settledAmount,
              remainingAmount,
              status: 'PENDING',
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
    const { centerId, status, startDate, endDate, search, sortBy, sortOrder, page, limit } = filters;

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

    const [data, total] = await Promise.all([
      prisma.settlement.findMany({
        where,
        include: settlementInclude,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.settlement.count({ where }),
    ]);

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

  async reject(settlementId: string, adminId: string, notes: string) {
    const settlement = await prisma.settlement.findUnique({ where: { id: settlementId } });
    if (!settlement) throw ApiError.notFound('Settlement not found');
    if (settlement.status !== 'PENDING') throw ApiError.badRequest('Settlement is not pending');
    return prisma.settlement.update({
      where: { id: settlementId },
      data: { status: 'REJECTED', approvedBy: adminId, notes },
      include: settlementInclude,
    });
  }

  async deleteSettlement(id: string) {
    const settlement = await prisma.settlement.findUnique({ where: { id } });
    if (!settlement) throw ApiError.notFound('Settlement not found');
    await prisma.settlement.delete({ where: { id } });
  }
}
