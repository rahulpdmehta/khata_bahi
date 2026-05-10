import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import type { CreateSettlementDto, SettlementFiltersDto } from './settlement.dto';

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

export class SettlementService {
  async preview(centerId: string, settlementDate: string) {
    const date = new Date(settlementDate);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const directCash = await prisma.transaction.aggregate({
      where: { centerId, transactionDate: { gte: start, lte: end }, paymentMode: 'CASH' },
      _sum: { amount: true },
    });
    const splitCash = await prisma.transactionPayment.aggregate({
      where: { paymentMode: 'CASH', transaction: { centerId, transactionDate: { gte: start, lte: end } } },
      _sum: { amount: true },
    });
    const totalIncome = (directCash._sum.amount?.toNumber() ?? 0) + (splitCash._sum.amount?.toNumber() ?? 0);

    const expenseAgg = await prisma.expense.aggregate({
      where: { centerId, expenseDate: { gte: start, lte: end }, status: 'APPROVED' },
      _sum: { amount: true },
    });
    const totalExpenses = expenseAgg._sum.amount?.toNumber() ?? 0;

    return { totalIncome, totalExpenses, netAmount: totalIncome - totalExpenses };
  }

  async create(userId: string, dto: CreateSettlementDto) {
    const settlementDate = new Date(dto.settlementDate);
    const startOfDay = new Date(settlementDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(settlementDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.settlement.findFirst({
      where: {
        centerId: dto.centerId,
        settlementDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existing) {
      throw ApiError.conflict('A settlement already exists for this center on this date');
    }

    // Only CASH transactions count as income for settlement
    const directCashAggregate = await prisma.transaction.aggregate({
      where: {
        centerId: dto.centerId,
        transactionDate: { gte: startOfDay, lte: endOfDay },
        paymentMode: 'CASH',
      },
      _sum: { amount: true },
    });

    // CASH portions from SPLIT transactions
    const splitCashAggregate = await prisma.transactionPayment.aggregate({
      where: {
        paymentMode: 'CASH',
        transaction: {
          centerId: dto.centerId,
          transactionDate: { gte: startOfDay, lte: endOfDay },
        },
      },
      _sum: { amount: true },
    });

    const incomeAggregate = {
      _sum: {
        amount: (directCashAggregate._sum.amount?.toNumber() ?? 0) + (splitCashAggregate._sum.amount?.toNumber() ?? 0),
      },
    };

    const expenseAggregate = await prisma.expense.aggregate({
      where: {
        centerId: dto.centerId,
        expenseDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'APPROVED',
      },
      _sum: { amount: true },
    });

    const totalIncome = typeof incomeAggregate._sum.amount === 'number'
      ? incomeAggregate._sum.amount
      : (incomeAggregate._sum.amount as unknown as { toNumber(): number } | null)?.toNumber() ?? 0;
    const totalExpenses = expenseAggregate._sum.amount?.toNumber() ?? 0;
    const netAmount = totalIncome - totalExpenses;
    const finalAmount = netAmount + dto.carryForwardAmount;
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
        carryForwardAmount: dto.carryForwardAmount,
        finalAmount,
        status: 'PENDING',
        notes: dto.notes,
      },
      include: settlementInclude,
    });

    return settlement;
  }

  async findAll(userId: string, role: string, filters: SettlementFiltersDto) {
    const { centerId, status, startDate, endDate, search, sortBy, sortOrder, page, limit } = filters;

    const where: Record<string, unknown> = {};

    if (role === 'STAFF') {
      const userCenters = await prisma.userCenter.findMany({
        where: { userId },
        select: { centerId: true },
      });
      const centerIds = userCenters.map((uc) => uc.centerId);
      where.centerId = { in: centerIds };
    } else if (centerId) {
      where.centerId = centerId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.settlementDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.settlementDate = { gte: new Date(startDate) };
    } else if (endDate) {
      where.settlementDate = { lte: new Date(endDate) };
    }

    if (search) {
      where.settlementNumber = { contains: search };
    }

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

  async findById(id: string) {
    const settlement = await prisma.settlement.findUnique({
      where: { id },
      include: settlementInclude,
    });

    if (!settlement) {
      throw ApiError.notFound('Settlement not found');
    }

    return settlement;
  }

  async approve(settlementId: string, adminId: string) {
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw ApiError.notFound('Settlement not found');
    }

    if (settlement.status !== 'PENDING') {
      throw ApiError.badRequest('Settlement is not pending');
    }

    const updated = await prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: 'APPROVED',
        approvedBy: adminId,
        approvedAt: new Date(),
      },
      include: settlementInclude,
    });

    return updated;
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
