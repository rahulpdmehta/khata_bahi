# Dashboard Settlement Totals Design

**Date:** 2026-06-02  
**Status:** Approved

## Goal

Add two all-time stat cards at the top of the dashboard (above the filter bar) showing total outstanding settlement dues and total carry-forward amount. These cards are admin-only, center-aware, and have no date filter.

---

## Section 1: Backend

### New service method

Add `getSettlementTotals(userId, role, centerId?)` to `backend/src/modules/dashboard/dashboard.service.ts`:

- Uses the existing `centerScope` private helper to scope the query to the selected center (or all admin-accessible centers if no `centerId` is passed)
- Single Prisma aggregate query:
  ```typescript
  prisma.settlement.aggregate({
    where: centerFilter,
    _sum: { remainingAmount: true, carryForwardAmount: true },
  })
  ```
- No date filter — all-time
- Returns:
  ```typescript
  { totalRemainingDues: number, totalCarryForward: number }
  ```

### New route

`GET /api/v1/dashboard/settlement-totals?centerId=<optional>`

- Secured with `authenticate` + `requireRole('ADMIN')`
- Controller reads optional `centerId` from query string and delegates to `getSettlementTotals`

**Files modified:**
- `backend/src/modules/dashboard/dashboard.service.ts`
- `backend/src/modules/dashboard/dashboard.controller.ts`
- `backend/src/modules/dashboard/dashboard.routes.ts`

---

## Section 2: Frontend

### State

New state in `DashboardPage.tsx`:
```typescript
const [settlementTotals, setSettlementTotals] = useState<{
  totalRemainingDues: number;
  totalCarryForward: number;
} | null>(null);
```

### Data fetch

A dedicated `useEffect` that fires only when `centerId` changes (not on date preset changes):
```typescript
useEffect(() => {
  if (!isAdmin) return;
  const params = centerId ? { centerId } : {};
  apiClient.get('/dashboard/settlement-totals', { params })
    .then(res => setSettlementTotals(res.data?.data ?? null))
    .catch(() => setSettlementTotals(null));
}, [centerId, isAdmin]);
```

### UI

Two `StatCard`s rendered **above the filter bar card**, in their own labeled `Grid` row. The entire block is wrapped in `{isAdmin && (...)}`.

```
┌─────────────────────────────────────────────────────────────┐
│  ALL TIME                                                    │
│  ┌──────────────────────────┐  ┌──────────────────────────┐ │
│  │ ALL TIME                 │  │ ALL TIME                 │ │
│  │ Settlement Dues          │  │ Carry-Forward            │ │
│  │ ₹X,XXX                   │  │ ₹X,XXX                   │ │
│  │ [amber accent]           │  │ [indigo accent]          │ │
│  └──────────────────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

Card details:
- **Settlement Dues**: label="Settlement Dues", `value=settlementTotals?.totalRemainingDues ?? 0`, `accentColor="#f59e0b"`, `icon=<AccountBalanceIcon />`, `period="All Time"`, `trend="neutral"`, `loading=totalsLoading`
- **Carry-Forward**: label="Carry-Forward", `value=settlementTotals?.totalCarryForward ?? 0`, `accentColor="#6366f1"`, `icon=<TrendingUpIcon />`, `period="All Time"`, `trend="neutral"`, `loading=totalsLoading`

Add a `totalsLoading` boolean state (set true before fetch, false after) to drive the skeleton state on the cards.

**File modified:** `frontend/src/features/dashboard/DashboardPage.tsx`

---

## Out of Scope

- Staff view (cards are hidden for non-admin users)
- Date filtering on these cards
- Per-center breakdown table
