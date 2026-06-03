import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { assertCenterAccess } from '../../utils/centerAccess';
import { assertDayNotSettled } from '../../utils/settlementLock';
import type { CreateEditRequestDto, EditRequestFiltersDto } from './editRequest.dto';

const editRequestInclude = {
  transaction: { include: { vehicleType: true, incomeSource: true, center: true } },
  expense: { include: { category: true, center: true } },
  settlement: { include: { center: true } },
  requester: { select: { id: true, username: true } },
  reviewer: { select: { id: true, username: true } },
};

export class EditRequestService {
  async create(userId: string, dto: CreateEditRequestDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    let originalData: Record<string, unknown> = {};

    if (dto.resourceType === 'SETTLEMENT' && dto.settlementId) {
      const settlement = await prisma.settlement.findUnique({ where: { id: dto.settlementId } });
      if (!settlement) throw ApiError.notFound('Settlement not found');
      await assertCenterAccess(userId, user?.role ?? 'STAFF', settlement.centerId);
      if (settlement.userId !== userId && user?.role !== 'ADMIN') {
        throw ApiError.forbidden('You do not own this settlement');
      }
      originalData = {
        carryForwardAmount: settlement.carryForwardAmount,
        settlementDate: settlement.settlementDate,
        notes: settlement.notes,
      };
    } else if (dto.resourceType === 'EXPENSE' && dto.expenseId) {
      const expense = await prisma.expense.findUnique({ where: { id: dto.expenseId } });
      if (!expense) throw ApiError.notFound('Expense not found');
      await assertCenterAccess(userId, user?.role ?? 'STAFF', expense.centerId);
      if (expense.userId !== userId && user?.role !== 'ADMIN') {
        throw ApiError.forbidden('You do not own this expense');
      }
      originalData = {
        amount: expense.amount,
        vendorName: expense.vendorName,
        description: expense.description,
      };
    } else if (dto.transactionId) {
      const transaction = await prisma.transaction.findUnique({ where: { id: dto.transactionId } });
      if (!transaction) throw ApiError.notFound('Transaction not found');
      await assertCenterAccess(userId, user?.role ?? 'STAFF', transaction.centerId);
      if (transaction.userId !== userId && user?.role !== 'ADMIN') {
        throw ApiError.forbidden('You do not own this transaction');
      }
      originalData = {
        vehicleNumber: transaction.vehicleNumber,
        amount: transaction.amount,
        notes: transaction.notes,
      };
    }

    return prisma.editRequest.create({
      data: {
        transactionId: dto.transactionId ?? null,
        expenseId: dto.expenseId ?? null,
        settlementId: dto.settlementId ?? null,
        resourceType: dto.resourceType,
        requestedBy: userId,
        requestReason: dto.requestReason,
        originalData: originalData as object,
        proposedChanges: dto.proposedChanges as object,
        status: 'PENDING',
      },
      include: editRequestInclude,
    });
  }

  async findAll(userId: string, role: string, filters: EditRequestFiltersDto) {
    const { status, page, limit } = filters;
    const where: Record<string, unknown> = {};
    if (role === 'STAFF') where.requestedBy = userId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.editRequest.findMany({
        where,
        include: editRequestInclude,
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.editRequest.count({ where }),
    ]);

    return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string, userId: string, role: string) {
    const editRequest = await prisma.editRequest.findUnique({ where: { id }, include: editRequestInclude });
    if (!editRequest) throw ApiError.notFound('Edit request not found');

    if (role === 'STAFF' && editRequest.requestedBy !== userId) {
      throw ApiError.forbidden('You do not have access to this edit request');
    }

    return editRequest;
  }

  async approve(requestId: string, adminId: string, reviewNotes?: string) {
    const editRequest = await prisma.editRequest.findUnique({ where: { id: requestId } });
    if (!editRequest) throw ApiError.notFound('Edit request not found');
    if (editRequest.status !== 'PENDING') throw ApiError.badRequest('Edit request is not pending');

    const changes = editRequest.proposedChanges as Record<string, unknown>;

    if (editRequest.resourceType === 'SETTLEMENT' && editRequest.settlementId) {
      const settlement = await prisma.settlement.findUnique({ where: { id: editRequest.settlementId } });
      if (!settlement) throw ApiError.notFound('Settlement not found');

      // Changing carry-forward or the date of a settlement that has later settlements would
      // orphan the carry-forward chain (downstream values were snapshotted from this one).
      const changesChainFields =
        changes.carryForwardAmount !== undefined || changes.settlementDate !== undefined;
      if (changesChainFields) {
        const later = await prisma.settlement.findFirst({
          where: { centerId: settlement.centerId, settlementDate: { gt: settlement.settlementDate } },
        });
        if (later) {
          throw ApiError.badRequest(
            'Cannot change the carry-forward or date of a settlement that has later settlements.'
          );
        }
      }

      const updateData: Record<string, unknown> = {};
      if (changes.carryForwardAmount !== undefined) {
        const carry = Number(changes.carryForwardAmount);
        const netAmount = Number(settlement.netAmount);
        const settledAmount = Number(settlement.settledAmount);
        updateData.carryForwardAmount = carry;
        updateData.finalAmount = netAmount + carry;
        // Keep the invariant: remaining = final - settled
        updateData.remainingAmount = netAmount + carry - settledAmount;
      }
      if (changes.settlementDate !== undefined) updateData.settlementDate = new Date(changes.settlementDate as string);
      if (changes.notes !== undefined) updateData.notes = changes.notes as string;
      await prisma.settlement.update({ where: { id: editRequest.settlementId }, data: updateData });
    } else if (editRequest.resourceType === 'EXPENSE' && editRequest.expenseId) {
      const expense = await prisma.expense.findUnique({ where: { id: editRequest.expenseId } });
      if (!expense) throw ApiError.notFound('Expense not found');
      await assertDayNotSettled(expense.centerId, expense.expenseDate);
      await prisma.expense.update({
        where: { id: editRequest.expenseId },
        data: {
          ...(changes.amount !== undefined && { amount: Number(changes.amount) }),
          ...(changes.vendorName !== undefined && { vendorName: changes.vendorName as string }),
          ...(changes.description !== undefined && { description: changes.description as string }),
        },
      });
    } else if (editRequest.transactionId) {
      const transaction = await prisma.transaction.findUnique({ where: { id: editRequest.transactionId } });
      if (!transaction) throw ApiError.notFound('Transaction not found');
      await assertDayNotSettled(transaction.centerId, transaction.transactionDate);
      await prisma.transaction.update({
        where: { id: editRequest.transactionId },
        data: {
          ...(changes.vehicleNumber !== undefined && { vehicleNumber: changes.vehicleNumber as string }),
          ...(changes.amount !== undefined && { amount: Number(changes.amount) }),
          ...(changes.notes !== undefined && { notes: changes.notes as string }),
          updatedBy: adminId,
        },
      });
    }

    return prisma.editRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED', reviewedBy: adminId, reviewNotes: reviewNotes ?? null, reviewedAt: new Date() },
      include: editRequestInclude,
    });
  }

  async reject(requestId: string, adminId: string, reviewNotes?: string) {
    const editRequest = await prisma.editRequest.findUnique({ where: { id: requestId } });
    if (!editRequest) throw ApiError.notFound('Edit request not found');
    if (editRequest.status !== 'PENDING') throw ApiError.badRequest('Edit request is not pending');

    return prisma.editRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', reviewedBy: adminId, reviewNotes: reviewNotes ?? null, reviewedAt: new Date() },
      include: editRequestInclude,
    });
  }
}
