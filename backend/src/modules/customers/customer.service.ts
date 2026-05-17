// backend/src/modules/customers/customer.service.ts
import { prisma } from '../../config/database';
import type { CustomerFiltersDto, CustomerDetailFiltersDto } from './customer.dto';

export class CustomerService {
  async findAll(filters: CustomerFiltersDto) {
    const { search, centerId, startDate, endDate, sortBy, sortOrder, page, limit } = filters;

    const txWhere: Record<string, unknown> = {
      customerMobile: { not: null },
    };

    if (centerId) txWhere.centerId = centerId;
    if (startDate) {
      txWhere.transactionDate = {
        ...(txWhere.transactionDate as object | undefined),
        gte: new Date(startDate),
      };
    }
    if (endDate) {
      txWhere.transactionDate = {
        ...(txWhere.transactionDate as object | undefined),
        lte: new Date(endDate),
      };
    }

    // Group by mobile to get aggregates
    const grouped = await prisma.transaction.groupBy({
      by: ['customerMobile'],
      where: txWhere,
      _count: { id: true },
      _sum: { amount: true },
      _max: { transactionDate: true, customerName: true },
    });

    // Apply search filter on grouped results (mobile or name)
    let filtered = grouped;
    if (search) {
      const q = search.toLowerCase();
      filtered = grouped.filter(
        (g) =>
          g.customerMobile?.toLowerCase().includes(q) ||
          g._max.customerName?.toLowerCase().includes(q)
      );
    }

    // Collect center names per customer
    const mobiles = filtered.map((g) => g.customerMobile!);
    const centerRows = await prisma.transaction.findMany({
      where: { customerMobile: { in: mobiles } },
      select: { customerMobile: true, center: { select: { centerName: true } } },
      distinct: ['customerMobile', 'centerId'],
    });

    const centerMap = new Map<string, string[]>();
    for (const row of centerRows) {
      if (!row.customerMobile) continue;
      const existing = centerMap.get(row.customerMobile) ?? [];
      if (!existing.includes(row.center.centerName)) {
        centerMap.set(row.customerMobile, [...existing, row.center.centerName]);
      }
    }

    // Build customer list
    const customers = filtered.map((g) => ({
      customerMobile: g.customerMobile!,
      customerName: g._max.customerName ?? 'Unknown',
      totalVisits: g._count.id,
      totalSpent: Number(g._sum.amount ?? 0),
      lastVisit: g._max.transactionDate?.toISOString().slice(0, 10) ?? null,
      centers: centerMap.get(g.customerMobile!) ?? [],
    }));

    // Sort
    customers.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'totalSpent') diff = a.totalSpent - b.totalSpent;
      else if (sortBy === 'totalVisits') diff = a.totalVisits - b.totalVisits;
      else diff = (a.lastVisit ?? '').localeCompare(b.lastVisit ?? '');
      return sortOrder === 'asc' ? diff : -diff;
    });

    const total = customers.length;
    const paginated = customers.slice((page - 1) * limit, page * limit);

    return {
      data: paginated,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByMobile(mobile: string, filters: CustomerDetailFiltersDto) {
    const { page, limit } = filters;

    const transactions = await prisma.transaction.findMany({
      where: { customerMobile: mobile },
      orderBy: { transactionDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        center: { select: { centerName: true } },
        incomeSource: { select: { sourceName: true } },
        payments: true,
      },
    });

    const total = await prisma.transaction.count({ where: { customerMobile: mobile } });

    const agg = await prisma.transaction.aggregate({
      where: { customerMobile: mobile },
      _count: { id: true },
      _sum: { amount: true },
      _max: { transactionDate: true, customerName: true },
    });

    return {
      customerMobile: mobile,
      customerName: agg._max.customerName ?? 'Unknown',
      totalVisits: agg._count.id,
      totalSpent: Number(agg._sum.amount ?? 0),
      lastVisit: agg._max.transactionDate?.toISOString().slice(0, 10) ?? null,
      transactions,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
