import { prisma } from '../../config/database';
import { startOfDay, endOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { buildCenterWhereClause, getStaffCenterIds } from '../../utils/centerAccess';

export class DashboardService {
  private async centerScope(
    userId: string,
    role: string,
    centerId?: string
  ): Promise<Record<string, unknown>> {
    return buildCenterWhereClause(userId, role, centerId);
  }

  async getOverview(userId: string, role: string, centerId?: string) {
    const today = new Date();
    const centerFilter = await this.centerScope(userId, role, centerId);
    const where = { ...centerFilter };

    const [todayIncome, todayExpenses, weekIncome, weekExpenses, monthIncome, monthExpenses] =
      await Promise.all([
        this.getIncome({
          ...where,
          transactionDate: {
            gte: startOfDay(today),
            lte: endOfDay(today),
          },
        }),
        this.getExpenses({
          ...where,
          expenseDate: {
            gte: startOfDay(today),
            lte: endOfDay(today),
          },
          status: 'APPROVED',
        }),
        this.getIncome({
          ...where,
          transactionDate: {
            gte: startOfWeek(today),
            lte: endOfDay(today),
          },
        }),
        this.getExpenses({
          ...where,
          expenseDate: {
            gte: startOfWeek(today),
            lte: endOfDay(today),
          },
          status: 'APPROVED',
        }),
        this.getIncome({
          ...where,
          transactionDate: {
            gte: startOfMonth(today),
            lte: endOfDay(today),
          },
        }),
        this.getExpenses({
          ...where,
          expenseDate: {
            gte: startOfMonth(today),
            lte: endOfDay(today),
          },
          status: 'APPROVED',
        }),
      ]);

    return {
      today: {
        income: todayIncome,
        expenses: todayExpenses,
        profit: todayIncome - todayExpenses,
      },
      week: {
        income: weekIncome,
        expenses: weekExpenses,
        profit: weekIncome - weekExpenses,
      },
      month: {
        income: monthIncome,
        expenses: monthExpenses,
        profit: monthIncome - monthExpenses,
      },
    };
  }

  async getIncomeVsExpenseTrend(
    userId: string,
    role: string,
    startDate: Date,
    endDate: Date,
    centerId?: string
  ) {
    const centerFilter = await this.centerScope(userId, role, centerId);
    const txWhere: Record<string, unknown> = {
      ...centerFilter,
      transactionDate: { gte: startDate, lte: endDate },
    };
    const expWhere: Record<string, unknown> = {
      ...centerFilter,
      expenseDate: { gte: startDate, lte: endDate },
      status: 'APPROVED',
    };

    const [transactions, expenses] = await Promise.all([
      prisma.transaction.findMany({ where: txWhere, select: { transactionDate: true, amount: true } }),
      prisma.expense.findMany({ where: expWhere, select: { expenseDate: true, amount: true } }),
    ]);

    const incomeByDate = this.groupByDate(
      transactions.map((t) => ({ date: t.transactionDate, amount: Number(t.amount) }))
    );
    const expensesByDate = this.groupByDate(
      expenses.map((e) => ({ date: e.expenseDate, amount: Number(e.amount) }))
    );

    return { income: incomeByDate, expenses: expensesByDate };
  }

  private groupByDate(records: { date: Date; amount: number }[]): { date: string; total: number }[] {
    const map = new Map<string, number>();
    for (const r of records) {
      const key = r.date.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + r.amount);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date, total }));
  }

  /** All centers for admin; assigned centers only for staff. */
  async getCenterPerformance(userId: string, role: string, startDate: Date, endDate: Date) {
    const centerWhere =
      role === 'ADMIN'
        ? { isActive: true }
        : { isActive: true, id: { in: await getStaffCenterIds(userId) } };

    const centers = await prisma.center.findMany({
      where: centerWhere,
      orderBy: { centerName: 'asc' },
    });

    const performance = await Promise.all(
      centers.map(async (center) => {
        const [income, expenses] = await Promise.all([
          this.getIncome({
            centerId: center.id,
            transactionDate: {
              gte: startDate,
              lte: endDate,
            },
          }),
          this.getExpenses({
            centerId: center.id,
            expenseDate: {
              gte: startDate,
              lte: endDate,
            },
            status: 'APPROVED',
          }),
        ]);

        return {
          center,
          income,
          expenses,
          profit: income - expenses,
        };
      })
    );

    return performance;
  }

  async getExpenseBreakdown(
    userId: string,
    role: string,
    startDate: Date,
    endDate: Date,
    centerId?: string
  ) {
    const centerFilter = await this.centerScope(userId, role, centerId);
    const where: Record<string, unknown> = {
      ...centerFilter,
      expenseDate: {
        gte: startDate,
        lte: endDate,
      },
      status: 'APPROVED',
    };

    const result = await prisma.expense.groupBy({
      by: ['categoryId'],
      where,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const categories = await prisma.expenseCategory.findMany({
      where: {
        id: {
          in: result.map((r) => r.categoryId),
        },
      },
    });

    return result.map((r) => ({
      category: categories.find((c) => c.id === r.categoryId)!,
      // Number-cast so JSON sends a number, not a Decimal-as-string (Recharts
      // can't compute pie arcs from strings — matches getPaymentModeBreakdown).
      totalAmount: Number(r._sum.amount || 0),
      count: r._count.id,
    }));
  }

  async getPaymentModeBreakdown(
    userId: string,
    role: string,
    startDate: Date,
    endDate: Date,
    centerId?: string
  ) {
    const centerFilter = await this.centerScope(userId, role, centerId);
    const baseWhere: Record<string, unknown> = {
      ...centerFilter,
      transactionDate: { gte: startDate, lte: endDate },
    };

    const normalResult = await prisma.transaction.groupBy({
      by: ['paymentMode'],
      where: { ...baseWhere, paymentMode: { not: 'SPLIT' } },
      _sum: { amount: true },
      _count: { id: true },
    });

    const splitPayments = await prisma.transactionPayment.findMany({
      where: {
        transaction: { ...baseWhere, paymentMode: 'SPLIT' },
      },
      select: { paymentMode: true, amount: true },
    });

    const map = new Map<string, { totalAmount: number; count: number }>();

    for (const r of normalResult) {
      map.set(r.paymentMode, {
        totalAmount: Number(r._sum.amount || 0),
        count: r._count.id,
      });
    }

    for (const sp of splitPayments) {
      const key = sp.paymentMode;
      const existing = map.get(key) ?? { totalAmount: 0, count: 0 };
      map.set(key, {
        totalAmount: existing.totalAmount + Number(sp.amount),
        count: existing.count,
      });
    }

    return Array.from(map.entries()).map(([paymentMode, data]) => ({
      paymentMode,
      totalAmount: data.totalAmount,
      count: data.count,
    }));
  }

  async getSettlementDue(
    userId: string,
    role: string,
    startDate: Date,
    endDate: Date,
    centerId?: string
  ) {
    const centerFilter = await this.centerScope(userId, role, centerId);
    const txWhere: Record<string, unknown> = {
      ...centerFilter,
      transactionDate: { gte: startDate, lte: endDate },
    };

    const directCash = await prisma.transaction.aggregate({
      where: { ...txWhere, paymentMode: 'CASH' },
      _sum: { amount: true },
    });

    const splitCash = await prisma.transactionPayment.aggregate({
      where: {
        paymentMode: 'CASH',
        transaction: { ...txWhere, paymentMode: 'SPLIT' },
      },
      _sum: { amount: true },
    });

    const cashIncome = Number(directCash._sum.amount || 0) + Number(splitCash._sum.amount || 0);

    const expWhere: Record<string, unknown> = {
      ...centerFilter,
      expenseDate: { gte: startDate, lte: endDate },
      status: 'APPROVED',
    };
    const expenses = await prisma.expense.aggregate({
      where: expWhere,
      _sum: { amount: true },
    });
    const totalExpenses = Number(expenses._sum.amount || 0);

    const setWhere: Record<string, unknown> = {
      ...centerFilter,
      settlementDate: { gte: startDate, lte: endDate },
      status: 'APPROVED',
    };
    const settled = await prisma.settlement.aggregate({
      where: setWhere,
      _sum: { finalAmount: true },
    });
    const totalSettled = Number(settled._sum.finalAmount || 0);

    return {
      cashIncome,
      totalExpenses,
      totalSettled,
      settlementDue: Math.max(0, cashIncome - totalExpenses - totalSettled),
    };
  }

  async getSettlementTotals(userId: string, role: string, centerId?: string) {
    const centerFilter = await this.centerScope(userId, role, centerId);
    // Settlement dues (till now), per center:
    //   dues = cashCollected(after last settlement)
    //          + carryForward (last settlement's remainingAmount)
    //          − expenses(after last settlement),  floored at 0
    // The carry-forward already captures everything up to the last settlement,
    // so we only add cash/expenses dated strictly after it. A center with no
    // settlement counts all cash/expenses with carryForward = 0.
    const lastSettlements = await prisma.settlement.findMany({
      where: { ...centerFilter, status: { not: 'REJECTED' } },
      orderBy: [{ centerId: 'asc' }, { settlementDate: 'desc' }],
      distinct: ['centerId'],
      select: { centerId: true, settlementDate: true, remainingAmount: true },
    });
    const lastByCenter = new Map<string, { date: Date; carried: number }>(
      lastSettlements.map((s) => [s.centerId, { date: s.settlementDate, carried: Number(s.remainingAmount ?? 0) }])
    );

    // Report every center that has a settlement or any transactions in scope.
    const txCenters = await prisma.transaction.findMany({
      where: centerFilter,
      distinct: ['centerId'],
      select: { centerId: true },
    });
    const centerIds = [...new Set<string>([...lastByCenter.keys(), ...txCenters.map((t) => t.centerId)])];

    const centers = await prisma.center.findMany({
      where: { id: { in: centerIds } },
      select: { id: true, centerName: true },
    });
    const nameById = new Map<string, string>(centers.map((c) => [c.id, c.centerName] as [string, string]));

    const rows = await Promise.all(
      centerIds.map(async (id) => {
        const last = lastByCenter.get(id);
        const txDate = last ? { transactionDate: { gt: last.date } } : {};
        const expDate = last ? { expenseDate: { gt: last.date } } : {};
        const [directCash, splitCash, expenses] = await Promise.all([
          prisma.transaction.aggregate({
            where: { centerId: id, paymentMode: 'CASH', ...txDate },
            _sum: { amount: true },
          }),
          prisma.transactionPayment.aggregate({
            where: { paymentMode: 'CASH', transaction: { centerId: id, paymentMode: 'SPLIT', ...txDate } },
            _sum: { amount: true },
          }),
          prisma.expense.aggregate({
            where: { centerId: id, status: 'APPROVED', ...expDate },
            _sum: { amount: true },
          }),
        ]);
        const cashAfter = Number(directCash._sum.amount ?? 0) + Number(splitCash._sum.amount ?? 0);
        const expAfter = Number(expenses._sum.amount ?? 0);
        const dues = Math.max(0, cashAfter + (last?.carried ?? 0) - expAfter);
        return {
          centerId: id,
          centerName: nameById.get(id) ?? '',
          totalRemainingDues: dues,
          totalCarryForward: dues,
        };
      })
    );

    return rows.sort((a, b) => a.centerName.localeCompare(b.centerName));
  }

  private async getIncome(where: Record<string, unknown>) {
    const result = await prisma.transaction.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount || 0);
  }

  private async getExpenses(where: Record<string, unknown>) {
    const result = await prisma.expense.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount || 0);
  }
}
