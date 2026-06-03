import { SettlementService } from './settlement.service';

// Build a minimal settlement row shaped enough for aggregateBatchGroup.
// aggregateBatchGroup reads numeric fields via Number(...), so plain numbers are fine.
function row(overrides: Record<string, unknown>) {
  return {
    id: 'id',
    batchId: 'batch-1',
    centerId: 'center-1',
    center: { centerName: 'ARUN CRANE SERVICE' },
    settlementDate: new Date('2026-06-02'),
    createdAt: new Date('2026-06-03T20:17:00.000Z'),
    totalIncome: 0,
    totalExpenses: 0,
    netAmount: 0,
    carryForwardAmount: 0,
    settledAmount: 0,
    remainingAmount: 0,
    finalAmount: 0,
    status: 'PENDING',
    ...overrides,
  };
}

describe('SettlementService.aggregateBatchGroup', () => {
  // Reproduces the real ARUN CRANE SERVICE batch: two days, ₹640 net each,
  // ₹600 paid greedily oldest-first. Per-day rows chain the carry-forward
  // (Jun 3 carries in Jun 2's unpaid ₹40), which is correct for the
  // next-settlement carry read — but the batch aggregate must NOT re-count it.
  const records = [
    row({
      settlementDate: new Date('2026-06-02'),
      totalIncome: 640,
      netAmount: 640,
      carryForwardAmount: 0,
      finalAmount: 640,
      settledAmount: 600,
      remainingAmount: 40,
    }),
    row({
      settlementDate: new Date('2026-06-03'),
      totalIncome: 640,
      netAmount: 640,
      carryForwardAmount: 40, // chained in from Jun 2's leftover
      finalAmount: 680,
      settledAmount: 0,
      remainingAmount: 680,
    }),
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batch = (new SettlementService() as any).aggregateBatchGroup(records);

  it('reports net = sum of day nets', () => {
    expect(batch.netAmount).toBe(1280);
  });

  it('reports the batch carry-in (first day), not a sum', () => {
    expect(batch.carryForwardAmount).toBe(0);
  });

  it('reports settled = sum of day settlements', () => {
    expect(batch.settledAmount).toBe(600);
  });

  it('does not double-count the internal carry in finalAmount', () => {
    // net (1280) + batch carry-in (0) — NOT 640 + 680 = 1320
    expect(batch.finalAmount).toBe(1280);
  });

  it('reports total outstanding without double-counting (last day remaining)', () => {
    // 40 + 680 = 720 would double-count Jun 2's carried ₹40
    expect(batch.remainingAmount).toBe(680);
  });

  it('preserves the invariant settled + remaining = final at batch level', () => {
    expect(batch.settledAmount + batch.remainingAmount).toBe(batch.finalAmount);
  });
});
