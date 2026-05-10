import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import type { CreateExpenseDto, ExpenseFiltersDto } from './expense.dto';

export class ExpenseService {
  async create(userId: string, role: string, dto: CreateExpenseDto) {
    if (role !== 'ADMIN') {
      const userCenter = await prisma.userCenter.findFirst({
        where: { userId, centerId: dto.centerId },
      });
      if (!userCenter) {
        throw ApiError.forbidden('You do not have access to this center');
      }
    }

    const category = await prisma.expenseCategory.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category || !category.isActive) {
      throw ApiError.badRequest('Invalid expense category');
    }

    const expenseNumber = `EXP${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const shouldAutoApprove =
      category.approvalThreshold && dto.amount <= category.approvalThreshold.toNumber();

    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        centerId: dto.centerId,
        userId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        paymentMode: dto.paymentMode,
        vendorName: dto.vendorName,
        description: dto.description,
        expenseDate: new Date(dto.expenseDate),
        receiptUrl: dto.receiptUrl,
        status: shouldAutoApprove ? 'APPROVED' : 'PENDING',
        approvedBy: shouldAutoApprove ? userId : null,
        approvedAt: shouldAutoApprove ? new Date() : null,
      },
      include: {
        category: true,
        center: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return expense;
  }

  async findAll(userId: string, filters: ExpenseFiltersDto) {
    const { centerId, startDate, endDate, categoryId, status, search, sortBy, sortOrder, page, limit } = filters;

    const where: Record<string, unknown> = {};

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { centers: true },
    });

    if (!user) {
      throw ApiError.unauthorized('User session invalid. Please log in again.');
    }

    if (user.role === 'STAFF') {
      const centerIds = user.centers.map((uc) => uc.centerId);
      where.centerId = { in: centerIds };
    } else if (centerId) {
      where.centerId = centerId as string;
    }

    if (startDate && endDate) {
      where.expenseDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { vendorName: { contains: search } },
        { expenseNumber: { contains: search } },
      ];
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          category: true,
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
        },
        orderBy: sortBy === 'expenseDate'
          ? [{ expenseDate: sortOrder }, { createdAt: sortOrder }]
          : [{ [sortBy]: sortOrder }, { createdAt: sortOrder }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    return {
      data: expenses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approve(adminId: string, expenseId: string) {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw ApiError.notFound('Expense not found');
    }

    if (expense.status !== 'PENDING') {
      throw ApiError.badRequest('Expense is not pending approval');
    }

    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        status: 'APPROVED',
        approvedBy: adminId,
        approvedAt: new Date(),
      },
      include: {
        category: true,
        center: true,
      },
    });

    return updated;
  }

  async reject(adminId: string, expenseId: string, rejectionReason: string) {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw ApiError.notFound('Expense not found');
    }

    if (expense.status !== 'PENDING') {
      throw ApiError.badRequest('Expense is not pending approval');
    }

    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        status: 'REJECTED',
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectionReason,
      },
      include: {
        category: true,
        center: true,
      },
    });

    return updated;
  }

  async getCategories() {
    return prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { categoryName: 'asc' },
    });
  }

  async deleteExpense(id: string) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw ApiError.notFound('Expense not found');
    await prisma.expense.delete({ where: { id } });
  }

  async updateExpense(id: string, data: Record<string, unknown>) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw ApiError.notFound('Expense not found');
    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(data.amount !== undefined ? { amount: Number(data.amount) } : {}),
        ...(data.vendorName !== undefined ? { vendorName: String(data.vendorName) } : {}),
        ...(data.description !== undefined ? { description: String(data.description) } : {}),
        ...(data.status !== undefined ? { status: data.status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {}),
      },
      include: { category: true, center: true, user: { select: { id: true, username: true } } },
    });
    return updated;
  }
}
