// Drives the REAL SettlementService.create() carry-forward logic with a mocked
// DB layer, proving that a new settlement created the day after an approved
// batch carries in the batch's outstanding balance (the last approved day's
// remainingAmount = ₹680), not a single day's net.

const findFirst = jest.fn();
const settlementCreate = jest.fn();
const settlementDelete = jest.fn();
// Mimic Prisma.Decimal: supports both `.toNumber()` and `Number(x)` coercion.
const decimal = (n: number) => ({ toNumber: () => n, valueOf: () => n });

jest.mock('../../config/database', () => ({
  prisma: {
    settlement: { findFirst: (...a: unknown[]) => findFirst(...a) },
    transaction: { aggregate: jest.fn() },
    transactionPayment: { aggregate: jest.fn() },
    expense: { aggregate: jest.fn() },
    $transaction: (cb: (tx: unknown) => unknown) =>
      cb({
        settlement: { create: (...a: unknown[]) => settlementCreate(...a), delete: settlementDelete },
      }),
  },
}));

jest.mock('../../utils/centerAccess', () => ({
  assertCenterAccess: jest.fn().mockResolvedValue(undefined),
  buildCenterWhereClause: jest.fn(),
}));

import { prisma } from '../../config/database';
import { SettlementService } from './settlement.service';

describe('carry-forward propagation after an approved batch', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Last APPROVED settlement = Jun 3 (last day of the approved batch),
    // which holds the chained total outstanding of ₹680.
    findFirst.mockImplementation((args: { where?: { status?: string } }) => {
      const status = args?.where?.status;
      if (status === 'APPROVED') {
        return Promise.resolve({
          id: 'jun3',
          settlementDate: new Date('2026-06-03T00:00:00'),
          remainingAmount: decimal(680),
          status: 'APPROVED',
        });
      }
      // pending-block check and same-date existing check: nothing there
      return Promise.resolve(null);
    });

    // Jun 4 day financials: ₹500 cash income, no expenses → net ₹500
    (prisma.transaction.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: decimal(500) } });
    (prisma.transactionPayment.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: null } });
    (prisma.expense.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: null } });

    settlementCreate.mockImplementation(({ data }: { data: unknown }) => Promise.resolve(data));
  });

  it('carries in ₹680 and computes final = day net + carry-in', async () => {
    const service = new SettlementService();
    await service.create('user-1', 'ADMIN', {
      centerId: 'center-1',
      settlementDate: '2026-06-04T00:00:00',
    });

    expect(settlementCreate).toHaveBeenCalledTimes(1);
    const written = settlementCreate.mock.calls[0][0].data;

    expect(written.carryForwardAmount).toBe(680); // ← the propagated balance
    expect(written.netAmount).toBe(500);
    expect(written.finalAmount).toBe(1180); // 500 + 680
  });
});
