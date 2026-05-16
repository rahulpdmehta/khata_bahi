import { prisma } from '../config/database';
import { ApiError } from './ApiError';

/** Center IDs assigned to a staff user via user_centers. */
export async function getStaffCenterIds(userId: string): Promise<string[]> {
  const rows = await prisma.userCenter.findMany({
    where: { userId },
    select: { centerId: true },
  });
  return rows.map((r) => r.centerId);
}

/**
 * Builds a Prisma `where` fragment for center scoping.
 * - ADMIN: optional single center filter, or all centers
 * - STAFF: only assigned centers; rejects foreign centerId in query
 */
export async function buildCenterWhereClause(
  userId: string,
  role: string,
  requestedCenterId?: string
): Promise<Record<string, unknown>> {
  if (role === 'ADMIN') {
    return requestedCenterId ? { centerId: requestedCenterId } : {};
  }

  const allowed = await getStaffCenterIds(userId);
  if (allowed.length === 0) {
    return { centerId: { in: [] as string[] } };
  }

  if (requestedCenterId) {
    if (!allowed.includes(requestedCenterId)) {
      throw ApiError.forbidden('You do not have access to this center');
    }
    return { centerId: requestedCenterId };
  }

  return { centerId: { in: allowed } };
}

/** Throws if staff is not assigned to the center. */
export async function assertCenterAccess(
  userId: string,
  role: string,
  centerId: string
): Promise<void> {
  if (role === 'ADMIN') return;

  const allowed = await getStaffCenterIds(userId);
  if (!allowed.includes(centerId)) {
    throw ApiError.forbidden('You do not have access to this center');
  }
}
