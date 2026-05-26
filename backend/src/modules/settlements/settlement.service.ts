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
      const { totalIncome, totalExpenses, netAmount } = await aggregateDayFinancials(
        centerId,
        day
      );
      const carryForwardAmount = runningCarryForward;
      const finalAmount = netAmount + carryForwardAmount;

      results.push({
        date: day.toISOString().slice(0, 10),
        totalIncome,
        totalExpenses,
        netAmount,
        carryForwardAmount,
        finalAmount,
      });

      // Each day in the batch is fully settled, so next day's carry-forward = 0
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

    const settlements = await prisma.$transaction(async (tx) => {
      const created: Awaited<ReturnType<typeof tx.settlement.create>>[] = [];
      for (const day of days) {
        const settlementDate = new Date(day.date);
        const settlementNumber = `SET${day.date.replace(/-/g, '')}${Date.now()}`;

        const settlement = await tx.settlement.create({
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
            settledAmount: day.finalAmount,
            remainingAmount: 0,
            status: 'PENDING',
            notes: dto.notes,
          },
          include: settlementInclude,
        });
        created.push(settlement);
      }
      return created;
    }).catch((err: { code?: string; message?: string }) => {
      if (err.code === 'P2002') {
        throw ApiError.conflict('One or more days in the batch already have settlements. Please refresh and try again.');
      }
      throw err;
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
