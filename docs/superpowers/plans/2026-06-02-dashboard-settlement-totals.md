# Dashboard Settlement Totals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two all-time stat cards (Settlement Dues + Carry-Forward) above the dashboard filter bar, visible to admins only, scoped to the selected center.

**Architecture:** New backend endpoint `GET /dashboard/settlement-totals` aggregates `remainingAmount` and `carryForwardAmount` from the settlements table with no date filter. Frontend fetches this in a dedicated `useEffect` that only re-runs when `centerId` changes (not date preset), and renders two `StatCard`s above the existing filter bar card.

**Tech Stack:** Node/Express + Prisma + TypeScript (backend), React + MUI + Redux (frontend).

---

### Task 1: Backend — service method, controller handler, route

**Files:**
- Modify: `backend/src/modules/dashboard/dashboard.service.ts`
- Modify: `backend/src/modules/dashboard/dashboard.controller.ts`
- Modify: `backend/src/modules/dashboard/dashboard.routes.ts`

- [ ] **Step 1: Add `getSettlementTotals` to the service**

In `backend/src/modules/dashboard/dashboard.service.ts`, add this method after `getSettlementDue`:

```typescript
async getSettlementTotals(userId: string, role: string, centerId?: string) {
  const centerFilter = await this.centerScope(userId, role, centerId);
  const result = await prisma.settlement.aggregate({
    where: centerFilter,
    _sum: { remainingAmount: true, carryForwardAmount: true },
  });
  return {
    totalRemainingDues: Number(result._sum.remainingAmount ?? 0),
    totalCarryForward: Number(result._sum.carryForwardAmount ?? 0),
  };
}
```

- [ ] **Step 2: Add controller handler**

In `backend/src/modules/dashboard/dashboard.controller.ts`, add this handler to the `DashboardController` class after `getSettlementDue`:

```typescript
getSettlementTotals = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { centerId } = req.query;
  const result = await dashboardService.getSettlementTotals(
    req.user!.userId,
    req.user!.role,
    centerId as string | undefined
  );
  res.json(ApiResponse.success(result));
});
```

- [ ] **Step 3: Add route**

In `backend/src/modules/dashboard/dashboard.routes.ts`, add the import for `requireRole` and the new route. Replace the entire file with:

```typescript
import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';

const router = Router();
const dashboardController = new DashboardController();

router.use(authenticate);

router.get('/overview', dashboardController.getOverview);
router.get('/income-vs-expense-trend', dashboardController.getIncomeVsExpenseTrend);
router.get('/center-performance', dashboardController.getCenterPerformance);
router.get('/expense-breakdown', dashboardController.getExpenseBreakdown);
router.get('/settlement-due', dashboardController.getSettlementDue);
router.get('/payment-mode-breakdown', dashboardController.getPaymentModeBreakdown);
router.get('/settlement-totals', requireRole('ADMIN'), dashboardController.getSettlementTotals);

export default router;
```

- [ ] **Step 4: Verify backend starts without TypeScript errors**

```bash
cd /Users/rahulmehta/Downloads/expense_app/backend && npm run dev
```

Expected: `🚀 Server running on port 3001`

- [ ] **Step 5: Smoke-test the endpoint**

```bash
# Get token
TOKEN=$(node -e "
const http = require('http');
const body = JSON.stringify({username:'admin',password:'admin123'});
const req = http.request({hostname:'localhost',port:3001,path:'/api/v1/auth/login',method:'POST',headers:{'Content-Type':'application/json','Content-Length':body.length}},(res)=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>console.log(JSON.parse(d).data.token));});
req.write(body);req.end();
")
echo "$TOKEN" | head -c 40

curl -s "http://localhost:3001/api/v1/dashboard/settlement-totals" \
  -H "Authorization: Bearer $TOKEN"
```

Expected response shape:
```json
{"success":true,"data":{"totalRemainingDues":0,"totalCarryForward":0}}
```
(exact numbers will vary based on DB data)

- [ ] **Step 6: Commit**

```bash
cd /Users/rahulmehta/Downloads/expense_app
git add backend/src/modules/dashboard/dashboard.service.ts \
        backend/src/modules/dashboard/dashboard.controller.ts \
        backend/src/modules/dashboard/dashboard.routes.ts
git commit -m "feat(dashboard): add settlement-totals endpoint — all-time remaining dues and carry-forward"
```

---

### Task 2: Frontend — state, fetch, and stat cards

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Add `settlementTotals` and `totalsLoading` state**

In `DashboardPage.tsx`, find the block of `useState` declarations (around line 350–357). After the `const [loading, setLoading] = useState(true);` line, add:

```typescript
const [settlementTotals, setSettlementTotals] = useState<{
  totalRemainingDues: number;
  totalCarryForward: number;
} | null>(null);
const [totalsLoading, setTotalsLoading] = useState(false);
```

- [ ] **Step 2: Add dedicated `useEffect` for fetching settlement totals**

In `DashboardPage.tsx`, find the `useEffect` that loads center list (around line 360):

```typescript
useEffect(() => {
  if (isAdmin) {
    apiClient.get('/admin/centers').then((res) => {
```

Add a NEW `useEffect` right after that block (after its closing `}, [isAdmin]);`):

```typescript
useEffect(() => {
  if (!isAdmin) return;
  setTotalsLoading(true);
  const params: Record<string, unknown> = {};
  if (centerId) params.centerId = centerId;
  apiClient.get('/dashboard/settlement-totals', { params })
    .then((res) => setSettlementTotals(res.data?.data ?? null))
    .catch(() => setSettlementTotals(null))
    .finally(() => setTotalsLoading(false));
}, [centerId, isAdmin]);
```

- [ ] **Step 3: Add the two all-time stat cards above the filter bar**

In `DashboardPage.tsx`, find the filter bar card — it starts with:
```tsx
{/* ── Filter Bar ── */}
<Card sx={{ borderRadius: '14px', mb: 2.5 }}>
```

Insert the following block IMMEDIATELY BEFORE that comment/card:

```tsx
{/* ── All-Time Settlement Stats (admin only, no date filter) ── */}
{isAdmin && (
  <Grid container spacing={2} sx={{ mb: 2.5 }}>
    <Grid item xs={12} sx={{ pb: 0 }}>
      <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        All Time
      </Typography>
    </Grid>
    <Grid item xs={6} sm={4}>
      <StatCard
        period="All Time"
        label="Settlement Dues"
        value={settlementTotals?.totalRemainingDues ?? 0}
        accentColor="#f59e0b"
        icon={<AccountBalanceIcon sx={{ fontSize: 20 }} />}
        loading={totalsLoading}
        trend="neutral"
      />
    </Grid>
    <Grid item xs={6} sm={4}>
      <StatCard
        period="All Time"
        label="Carry-Forward"
        value={settlementTotals?.totalCarryForward ?? 0}
        accentColor="#6366f1"
        icon={<TrendingUpIcon sx={{ fontSize: 20 }} />}
        loading={totalsLoading}
        trend="neutral"
      />
    </Grid>
  </Grid>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/rahulmehta/Downloads/expense_app/frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Check the dashboard in the browser**

Open http://localhost:5173/dashboard. Log in as admin. You should see:
- Two new cards at the very top labeled "ALL TIME" — "Settlement Dues" and "Carry-Forward"
- These cards do NOT change when you switch between Today / Last 7D / This Month filters
- Changing the Center dropdown DOES update these cards

- [ ] **Step 6: Commit**

```bash
cd /Users/rahulmehta/Downloads/expense_app
git add frontend/src/features/dashboard/DashboardPage.tsx
git commit -m "feat(dashboard): show all-time settlement dues and carry-forward cards above filter bar"
```
