// The dashboard "by center" table must show the true outstanding per center,
// not a naive sum across the per-day settlement rows of a batch (which
// double-counts the chained carry-forward). For ARUN's 2-day batch
// [rem 40, rem 680], dues = 680 (last day's remaining), NOT 40 + 680 = 720.

const settlementGroupBy = jest.fn();
const settlementFindMany = jest.fn();
const centerFindMany = jest.fn();

jest.mock('../../config/database', () => ({
  prisma: {
    settlement: {
      groupBy: (...a: unknown[]) => settlementGroupBy(...a),
      findMany: (...a: unknown[]) => settlementFindMany(...a),
    },
    center: { findMany: (...a: unknown[]) => centerFindMany(...a) },
  },
}));

jest.mock('../../utils/centerAccess', () => ({
  buildCenterWhereClause: jest.fn().mockResolvedValue({}),
}));

import { DashboardService } from './dashboard.service';

describe('DashboardService.getSettlementTotals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Old naive path (sum of all rows) would yield the buggy 720 / 40.
    settlementGroupBy.mockResolvedValue([
      { centerId: 'arun', _sum: { remainingAmount: 720, carryForwardAmount: 40 } },
    ]);
    // Correct path: latest non-rejected settlement per center → Jun 3, rem 680.
    settlementFindMany.mockResolvedValue([{ centerId: 'arun', remainingAmount: 680 }]);
    centerFindMany.mockResolvedValue([{ id: 'arun', centerName: 'ARUN CRANE SERVICE' }]);
  });

  it('reports dues as the latest settlement remaining, not the row sum', async () => {
    const result = await new DashboardService().getSettlementTotals('admin', 'ADMIN');
    expect(result).toHaveLength(1);
    expect(result[0].centerName).toBe('ARUN CRANE SERVICE');
    expect(result[0].totalRemainingDues).toBe(680); // not 720
  });

  it('reports carry-forward as the outstanding rolling to next (= dues)', async () => {
    const result = await new DashboardService().getSettlementTotals('admin', 'ADMIN');
    expect(result[0].totalCarryForward).toBe(680); // not 40
  });

  it('excludes rejected settlements from the outstanding query', async () => {
    await new DashboardService().getSettlementTotals('admin', 'ADMIN');
    const where = settlementFindMany.mock.calls[0][0].where;
    expect(where.status).toEqual({ not: 'REJECTED' });
  });
});
