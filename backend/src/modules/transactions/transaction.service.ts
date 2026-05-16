import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { assertCenterAccess, buildCenterWhereClause } from '../../utils/centerAccess';
import type { CreateTransactionDto, UpdateTransactionDto, TransactionFiltersDto } from './transaction.dto';

const transactionInclude = {
  vehicleType: true,
  incomeSource: true,
  center: true,
  payments: true,
  user: {
    select: {
      id: true,
      username: true,
    },
  },
};

export class TransactionService {
  async create(userId: string, role: string, dto: CreateTransactionDto) {
    await assertCenterAccess(userId, role, dto.centerId);

    const transactionNumber = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const isSplit = dto.splitPayments && dto.splitPayments.length > 1;
    const effectivePaymentMode = isSplit ? 'SPLIT' : (dto.splitPayments?.[0]?.paymentMode ?? dto.paymentMode ?? 'CASH');

    const transaction = await prisma.transaction.create({
      data: {
        transactionNumber,
        centerId: dto.centerId,
        userId,
        vehicleTypeId: dto.vehicleTypeId,
        vehicleNumber: dto.vehicleNumber,
        incomeSourceId: dto.incomeSourceId,
        amount: dto.amount,
        transactionDate: new Date(dto.transactionDate),
        transactionTime: new Date(),
        paymentMode: effectivePaymentMode,
        customerName: dto.customerName,
        customerMobile: dto.customerMobile,
        notes: dto.notes,
        isLocked: false,
        createdBy: userId,
        updatedBy: userId,
        ...(dto.splitPayments && dto.splitPayments.length > 0 && {
          payments: {
            create: dto.splitPayments.map((sp) => ({
              paymentMode: sp.paymentMode,
              amount: sp.amount,
            })),
          },
        }),
      },
      include: transactionInclude,
    });

    return transaction;
  }

  async findAll(userId: string, role: string, filters: TransactionFiltersDto) {
    const { centerId, startDate, endDate, vehicleTypeId, incomeSourceId, search, sortBy, sortOrder, page, limit } = filters;

    const where: Record<string, unknown> = {
      ...(await buildCenterWhereClause(userId, role, centerId)),
    };

    if (startDate && endDate) {
      where.transactionDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.transactionDate = { gte: new Date(startDate) };
    } else if (endDate) {
      where.transactionDate = { lte: new Date(endDate) };
    }

    if (vehicleTypeId) {
      where.vehicleTypeId = vehicleTypeId;
    }

    if (incomeSourceId) {
      where.incomeSourceId = incomeSourceId;
    }

    if (search) {
      where.vehicleNumber = { contains: search };
    }

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: transactionInclude,
        orderBy: sortBy === 'transactionDate'
          ? [{ transactionDate: sortOrder }, { transactionTime: sortOrder }]
          : [{ [sortBy]: sortOrder }, { transactionTime: sortOrder }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
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
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: transactionInclude,
    });

    if (!transaction) {
      throw ApiError.notFound('Transaction not found');
    }

    await assertCenterAccess(userId, role, transaction.centerId);

    return transaction;
  }

  async update(id: string, dto: UpdateTransactionDto, adminId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw ApiError.notFound('Transaction not found');
    }

    if (transaction.isLocked) {
      throw ApiError.badRequest('Transaction is locked and cannot be updated');
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.vehicleNumber !== undefined && { vehicleNumber: dto.vehicleNumber }),
        ...(dto.vehicleTypeId !== undefined && { vehicleTypeId: dto.vehicleTypeId }),
        ...(dto.incomeSourceId !== undefined && { incomeSourceId: dto.incomeSourceId }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.centerId !== undefined && { centerId: dto.centerId }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.transactionDate !== undefined && { transactionDate: new Date(dto.transactionDate) }),
        updatedBy: adminId,
      },
      include: transactionInclude,
    });

    return updated;
  }

  async delete(id: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw ApiError.notFound('Transaction not found');
    }

    if (transaction.isLocked) {
      throw ApiError.badRequest('Transaction is locked and cannot be deleted');
    }

    await prisma.transaction.delete({ where: { id } });

    return { message: 'Transaction deleted successfully' };
  }

  async getMyEntries(userId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        transactionDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        vehicleType: true,
        incomeSource: true,
      },
      orderBy: { transactionTime: 'desc' },
    });

    return transactions;
  }
}
