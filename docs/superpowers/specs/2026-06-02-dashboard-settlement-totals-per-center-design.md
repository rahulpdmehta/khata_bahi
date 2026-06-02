# Dashboard Settlement Totals — Per-Center Breakdown Design

**Date:** 2026-06-02
**Status:** Approved

## Goal

Show the all-time Settlement Dues and Carry-Forward on the dashboard **per center** instead of one combined total. Admin sees all their centers (or one when filtered); staff sees their own center(s). Replaces the two combined "ALL TIME" stat cards with a per-center table.

---

## Section 1: Backend

**File:** `backend/src/modules/dashboard/dashboard.service.ts`, `dashboard.routes.ts`

### Service

Change `getSettlementTotals(userId, role, centerId?)` to return a per-center array:

```typescript
{ centerId: string; centerName: string; totalRemainingDues: number; totalCarryForward: number }[]
```

Implementation:
1. `const centerFilter = await this.centerScope(userId, role, centerId);` (unchanged scoping).
2. `prisma.settlement.groupBy({ by: ['centerId'], where: centerFilter, _sum: { remainingAmount: true, carryForwardAmount: true } })` — one row per center that has settlements.
3. Fetch center names for the returned `centerId`s in one query: `prisma.center.findMany({ where: { id: { in: centerIds } }, select: { id: true, centerName: true } })`.
4. Map each group to `{ centerId, centerName, totalRemainingDues: Number(_sum.remainingAmount ?? 0), totalCarryForward: Number(_sum.carryForwardAmount ?? 0) }`.
5. Sort the result array by `centerName` ascending.

Scoping behavior (already handled by `centerScope` → `buildCenterWhereClause`):
- Admin, no `centerId` → all centers → all rows
- Admin, `centerId` set → just that center → one row
- Staff → only their assigned center(s)

### Route

In `dashboard.routes.ts`, **remove `requireRole('ADMIN')`** from the `/settlement-totals` route. Keep `authenticate` (applied globally via `router.use(authenticate)`). Staff access is safe because `centerScope` restricts the query to their centers.

```typescript
router.get('/settlement-totals', dashboardController.getSettlementTotals);
```

(The `requireRole` import may become unused in this file — remove it if so.)

---

## Section 2: Frontend

**File:** `frontend/src/features/dashboard/DashboardPage.tsx`

### State

```typescript
const [settlementTotals, setSettlementTotals] = useState<
  { centerId: string; centerName: string; totalRemainingDues: number; totalCarryForward: number }[]
>([]);
const [totalsLoading, setTotalsLoading] = useState(false);
```

### Fetch

Remove the `if (!isAdmin) return;` guard so the effect runs for both roles. Keep `centerId` in the dependency array (admin filter; harmless for staff who have no filter):

```typescript
useEffect(() => {
  setTotalsLoading(true);
  const params: Record<string, unknown> = {};
  if (centerId) params.centerId = centerId;
  apiClient.get('/dashboard/settlement-totals', { params })
    .then((res) => setSettlementTotals(Array.isArray(res.data?.data) ? res.data.data : []))
    .catch(() => setSettlementTotals([]))
    .finally(() => setTotalsLoading(false));
}, [centerId, isAdmin]);
```

### UI

Replace the two `StatCard`s (and their `{isAdmin && (...)}` wrapper) with a single Card — shown for **both roles**:

- Header: caption "ALL TIME — BY CENTER".
- A `TableContainer` (horizontal scroll on mobile) with `Table`:
  - Columns: **Center** | **Settlement Dues** (right-aligned) | **Carry-Forward** (right-aligned).
  - One row per center.
  - `totalRemainingDues > 0` → amber `#f59e0b` bold; else muted "—".
  - `totalCarryForward > 0` → indigo `#6366f1` bold; else muted "—".
- Loading (`totalsLoading`) → 3 skeleton rows.
- Empty array (not loading) → a single centered row "No settlement data yet".

---

## Out of Scope

- Changing the underlying aggregation metric (dues = sum of `remainingAmount`, carry-forward = sum of `carryForwardAmount`).
- Date filtering on these values (still all-time).
- Showing centers that have zero settlements ever (only centers with ≥1 settlement appear).
