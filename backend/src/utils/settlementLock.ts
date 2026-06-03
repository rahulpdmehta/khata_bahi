import { prisma } from '../config/database';
import { ApiError } from './ApiError';

/**
 * A day becomes "locked" once a non-rejected (PENDING or APPROVED) settlement exists
 * for that center+date. While locked, transactions/expenses for that day must not be
 * created, edited, deleted, or have their approval status changed — otherwise the
 * settlement's stored figures silently diverge from the underlying data.
 *
 * To change a settled day, reject its settlement first (which reopens the day).
 *
 * Dates are @db.Date (date-only); the window is built in UTC to stay timezone-safe.
 */
export async function assertDayNotSettled(centerId: string, date: Date): Promise<void> {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

  const settlement = await prisma.settlement.findFirst({
    where: {
      centerId,
      settlementDate: { gte: start, lte: end },
      status: { not: 'REJECTED' },
    },
    select: { id: true, status: true },
  });

  if (settlement) {
    throw ApiError.badRequest(
      `This day (${start.toISOString().slice(0, 10)}) is already settled. Reject its settlement before changing transactions or expenses for this date.`
    );
  }
}
