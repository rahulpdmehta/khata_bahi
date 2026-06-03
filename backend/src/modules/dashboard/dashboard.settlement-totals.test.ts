// Per-center "Settlement Dues (till now)" formula:
//   dues = cashCollected(after last settlement) + carryForward(last settlement remaining)
//          − expenses(after last settlement),  floored at 0
// "after" = strictly after the last settlement's date; a center with no
// settlement counts all cash/expenses with carryForward = 0.

const settlementFindMany = jest.fn();
const txFindMany = jest.fn();
const txAggregate = jest.fn();
const txPayAggregate = jest.fn();
const expAggregate = jest.fn();
const centerFindMany = jest.fn();

jest.mock('../../config/database', () => ({
  prisma: {
    settlement: { findMany: (...a: unknown[]) => settlementFindMany(...a) },
    transaction: { findMany: (...a: unknown[]) => txFindMany(...a), aggregate: (...a: unknown[]) => txAggregate(...a) },
    transactionPayment: { aggregate: (...a: unknown[]) => txPayAggregate(...a) },
    expense: { aggregate: (...a: unknown[]) => expAggregate(...a) },
    center: { findMany: (...a: unknown[]) => centerFindMany(...a) },
  },
}));

jest.mock('../../utils/centerAccess', () => ({
  buildCenterWhereClause: jest.fn().mockResolvedValue({}),
}));

import { DashboardService } from './dashboard.service';

type Where = { where?: { centerId?: string } };

describe('DashboardService.getSettlementTotals (cash-after-last-settlement)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // ARUN has a last settlement (Jun 3, remaining 680); OWNER has none.
    settlementFindMany.mockResolvedValue([
      { centerId: 'arun', settlementDate: new Date('2026-06-03'), remainingAmount: 680 },
    ]);
    txFindMany.mockResolvedValue([{ centerId: 'arun' }, { centerId: 'owner' }]);
    centerFindMany.mockResolvedValue([
      { id: 'arun', centerName: 'ARUN CRANE SERVICE' },
      { id: 'owner', centerName: 'OWNER' },
    ]);
    // cash collected (after last settlement, when one exists): owner 30, arun 100
    txAggregate.mockImplementation((a: Where) =>
      Promise.resolve({ _sum: { amount: a?.where?.centerId === 'owner' ? 30 : 100 } })
    );
    txPayAggregate.mockResolvedValue({ _sum: { amount: 0 } });
    expAggregate.mockResolvedValue({ _sum: { amount: 0 } });
  });

  const find = (rows: Array<{ centerId: string; totalRemainingDues: number }>, id: string) =>
    rows.find((r) => r.centerId === id)!;

  it('counts all cash for a center with no settlement (carryForward 0)', async () => {
    const rows = await new DashboardService().getSettlementTotals('admin', 'ADMIN');
    expect(find(rows, 'owner').totalRemainingDues).toBe(30);
  });

  it('adds carry-forward (last remaining) to cash collected after it', async () => {
    const rows = await new DashboardService().getSettlementTotals('admin', 'ADMIN');
    expect(find(rows, 'arun').totalRemainingDues).toBe(780); // 680 carried + 100 after
  });

  it('only counts cash AFTER the last settlement date', async () => {
    await new DashboardService().getSettlementTotals('admin', 'ADMIN');
    const arunCall = txAggregate.mock.calls.find((c) => c[0]?.where?.centerId === 'arun')![0];
    const ownerCall = txAggregate.mock.calls.find((c) => c[0]?.where?.centerId === 'owner')![0];
    expect(arunCall.where.transactionDate).toEqual({ gt: new Date('2026-06-03') });
    expect(ownerCall.where.transactionDate).toBeUndefined(); // no settlement → no cutoff
  });

  it('subtracts expenses after the settlement and floors at 0', async () => {
    expAggregate.mockResolvedValue({ _sum: { amount: 50 } }); // owner: 30 cash − 50 exp
    const rows = await new DashboardService().getSettlementTotals('admin', 'ADMIN');
    expect(find(rows, 'owner').totalRemainingDues).toBe(0);
  });
});
