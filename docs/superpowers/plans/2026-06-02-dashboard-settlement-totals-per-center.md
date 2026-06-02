# Dashboard Per-Center Settlement Totals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Show all-time Settlement Dues & Carry-Forward per center on the dashboard (admin: all/filtered centers; staff: own centers).

**Architecture:** Backend `getSettlementTotals` returns a per-center array via `groupBy`; route opened to staff (scoped by `centerScope`). Frontend renders a per-center table for both roles.

**Tech Stack:** Prisma/TypeScript backend, React + MUI frontend.

---

### Task 1: Backend — per-center groupBy + open route to staff

**Files:** `backend/src/modules/dashboard/dashboard.service.ts`, `backend/src/modules/dashboard/dashboard.routes.ts`

- [ ] **Step 1:** Replace `getSettlementTotals` body with per-center groupBy:
```typescript
  async getSettlementTotals(userId: string, role: string, centerId?: string) {
    const centerFilter = await this.centerScope(userId, role, centerId);
    const groups = await prisma.settlement.groupBy({
      by: ['centerId'],
      where: centerFilter,
      _sum: { remainingAmount: true, carryForwardAmount: true },
    });
    const centerIds = groups.map((g) => g.centerId);
    const centers = await prisma.center.findMany({
      where: { id: { in: centerIds } },
      select: { id: true, centerName: true },
    });
    const nameById = new Map(centers.map((c) => [c.id, c.centerName]));
    return groups
      .map((g) => ({
        centerId: g.centerId,
        centerName: nameById.get(g.centerId) ?? '',
        totalRemainingDues: Number(g._sum.remainingAmount ?? 0),
        totalCarryForward: Number(g._sum.carryForwardAmount ?? 0),
      }))
      .sort((a, b) => a.centerName.localeCompare(b.centerName));
  }
```

- [ ] **Step 2:** In `dashboard.routes.ts`, change the settlement-totals route to drop `requireRole('ADMIN')`:
```typescript
router.get('/settlement-totals', dashboardController.getSettlementTotals);
```
If `requireRole` is now unused in the file, remove its import.

- [ ] **Step 3:** `cd backend && npx tsc --noEmit` → no errors. Commit.

---

### Task 2: Frontend — array state, role-agnostic fetch, per-center table

**Files:** `frontend/src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1:** Replace the `settlementTotals` state with an array:
```typescript
  const [settlementTotals, setSettlementTotals] = useState<
    { centerId: string; centerName: string; totalRemainingDues: number; totalCarryForward: number }[]
  >([]);
  const [totalsLoading, setTotalsLoading] = useState(false);
```

- [ ] **Step 2:** Replace the settlement-totals `useEffect` (remove the `if (!isAdmin) return;` guard):
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

- [ ] **Step 3:** Replace the `{isAdmin && ( <Grid ...two StatCards... /> )}` block (the section commented `All-Time Settlement Stats`) with a per-center table Card shown for both roles:
```tsx
      {/* ── All-Time Settlement Dues & Carry-Forward, per center (no date filter) ── */}
      <Card sx={{ borderRadius: '14px', mb: 2.5 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', mb: 1 }}>
            All Time — by center
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Center</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Settlement Dues</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Carry-Forward</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {totalsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton variant="text" /></TableCell>
                      <TableCell><Skeleton variant="text" /></TableCell>
                      <TableCell><Skeleton variant="text" /></TableCell>
                    </TableRow>
                  ))
                ) : settlementTotals.length === 0 ? (
                  <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3, color: '#94a3b8' }}>No settlement data yet</TableCell></TableRow>
                ) : (
                  settlementTotals.map((c) => (
                    <TableRow key={c.centerId} hover>
                      <TableCell>{c.centerName}</TableCell>
                      <TableCell align="right">
                        {c.totalRemainingDues > 0
                          ? <Typography variant="body2" sx={{ fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(c.totalRemainingDues)}</Typography>
                          : <Typography variant="body2" sx={{ color: '#94a3b8' }}>—</Typography>}
                      </TableCell>
                      <TableCell align="right">
                        {c.totalCarryForward > 0
                          ? <Typography variant="body2" sx={{ fontWeight: 700, color: '#6366f1' }}>{formatCurrency(c.totalCarryForward)}</Typography>
                          : <Typography variant="body2" sx={{ color: '#94a3b8' }}>—</Typography>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
```

- [ ] **Step 4:** Remove now-unused `StatCard` usages were only here? No — `StatCard` is still used by the TODAY cards. Leave the `StatCard` component definition and its other usages untouched. `cd frontend && npx tsc --noEmit` → no errors (watch for unused `AccountBalanceIcon`/`TrendingUpIcon` — they remain used elsewhere; if a lint/TS unused error appears, leave the import only if still referenced). Commit.
