# Partial Settlement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow staff to submit a partial cash amount when creating a settlement; the unpaid remainder is stored on the record and auto-populated as the carry-forward on the next settlement.

**Architecture:** Two new nullable-defaulted-zero columns (`settledAmount`, `remainingAmount`) are added to the `settlements` table via a Prisma migration. The backend service computes them on create. The frontend gains a "Settled Amount" input, an updated summary card, a Remaining column in the history table, and updated carry-forward auto-fill logic.

**Tech Stack:** Prisma ORM (PostgreSQL), Express/TypeScript backend, React + Redux Toolkit + MUI frontend.

---

## File Map

| File | Change |
|---|---|
| `backend/prisma/schema.prisma` | Add `settledAmount` and `remainingAmount` fields to `Settlement` model |
| `backend/src/modules/settlements/settlement.dto.ts` | Add optional `settledAmount` to `createSettlementSchema` |
| `backend/src/modules/settlements/settlement.service.ts` | Compute and persist `settledAmount` / `remainingAmount` on create |
| `frontend/src/types/index.ts` | Add `settledAmount` and `remainingAmount` to `Settlement` interface |
| `frontend/src/features/settlements/SettlementsPage.tsx` | Settled Amount input, updated summary card, Remaining column, carry-forward auto-fill |

---

## Task 1: DB schema — add settledAmount and remainingAmount

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add the two fields to the Settlement model**

Open `backend/prisma/schema.prisma`. Locate the `Settlement` model. After the `finalAmount` line, add:

```prisma
settledAmount      Decimal          @default(0) @db.Decimal(10, 2)
remainingAmount    Decimal          @default(0) @db.Decimal(10, 2)
```

The full `Settlement` model should now look like:

```prisma
model Settlement {
  id                 String           @id @default(uuid()) @db.Char(36)
  settlementNumber   String           @unique @db.VarChar(50)
  centerId           String           @db.Char(36)
  userId             String           @db.Char(36)
  settlementDate     DateTime         @db.Date
  totalIncome        Decimal          @db.Decimal(10, 2)
  totalExpenses      Decimal          @default(0) @db.Decimal(10, 2)
  netAmount          Decimal          @db.Decimal(10, 2)
  carryForwardAmount Decimal          @default(0) @db.Decimal(10, 2)
  finalAmount        Decimal          @db.Decimal(10, 2)
  settledAmount      Decimal          @default(0) @db.Decimal(10, 2)
  remainingAmount    Decimal          @default(0) @db.Decimal(10, 2)
  status             SettlementStatus @default(PENDING)
  approvedBy         String?          @db.Char(36)
  approvedAt         DateTime?
  notes              String?
  createdAt          DateTime         @default(now())

  center       Center        @relation(fields: [centerId], references: [id])
  user         User          @relation("CreatedBy", fields: [userId], references: [id])
  approver     User?         @relation("ApprovedBy", fields: [approvedBy], references: [id])
  editRequests EditRequest[]

  @@unique([centerId, settlementDate])
  @@index([centerId, settlementDate])
  @@index([status])
  @@map("settlements")
}
```

- [ ] **Step 2: Run the Prisma migration**

```bash
cd backend
npx prisma migrate dev --name add_partial_settlement_fields
```

Expected output: `✔  Generated Prisma Client` and a new migration file under `prisma/migrations/`.

- [ ] **Step 3: Verify the columns exist**

```bash
cd backend
npx prisma studio
```

Open the `settlements` table in the browser that opens. Confirm `settledAmount` and `remainingAmount` columns are visible with `0` defaults. Close Studio.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add settledAmount and remainingAmount to settlements"
```

---

## Task 2: Backend DTO — accept optional settledAmount

**Files:**
- Modify: `backend/src/modules/settlements/settlement.dto.ts`

- [ ] **Step 1: Add the optional field to the schema**

Replace the entire file content with:

```typescript
import { z } from 'zod';

export const createSettlementSchema = z.object({
  centerId: z.string().uuid(),
  settlementDate: z.string(),
  carryForwardAmount: z.number().default(0),
  settledAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const settlementFiltersSchema = z.object({
  centerId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['settlementDate', 'totalIncome', 'netAmount']).default('settlementDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(50),
});

export type CreateSettlementDto = z.infer<typeof createSettlementSchema>;
export type SettlementFiltersDto = z.infer<typeof settlementFiltersSchema>;
```

- [ ] **Step 2: Verify the backend still compiles**

```bash
cd backend
npx ts-node --transpile-only src/server.ts &
sleep 3 && curl -s http://localhost:3001/health
```

Expected: `{"status":"OK",...}`

Kill the test process: `kill %1`

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/settlements/settlement.dto.ts
git commit -m "feat(settlements): accept optional settledAmount in create DTO"
```

---

## Task 3: Backend service — compute and persist settledAmount / remainingAmount

**Files:**
- Modify: `backend/src/modules/settlements/settlement.service.ts`

- [ ] **Step 1: Update the create method**

In `backend/src/modules/settlements/settlement.service.ts`, find the `create` method. Replace the block that computes `finalAmount` and calls `prisma.settlement.create` with:

```typescript
const totalIncome = typeof incomeAggregate._sum.amount === 'number'
  ? incomeAggregate._sum.amount
  : (incomeAggregate._sum.amount as unknown as { toNumber(): number } | null)?.toNumber() ?? 0;
const totalExpenses = expenseAggregate._sum.amount?.toNumber() ?? 0;
const netAmount = totalIncome - totalExpenses;
const finalAmount = netAmount + dto.carryForwardAmount;
const settledAmount = dto.settledAmount !== undefined
  ? Math.min(dto.settledAmount, finalAmount)
  : finalAmount;
const remainingAmount = finalAmount - settledAmount;
const settlementNumber = `SET${Date.now()}`;

const settlement = await prisma.settlement.create({
  data: {
    settlementNumber,
    centerId: dto.centerId,
    userId,
    settlementDate,
    totalIncome,
    totalExpenses,
    netAmount,
    carryForwardAmount: dto.carryForwardAmount,
    finalAmount,
    settledAmount,
    remainingAmount,
    status: 'PENDING',
    notes: dto.notes,
  },
  include: settlementInclude,
});

return settlement;
```

- [ ] **Step 2: Smoke-test via curl**

Start the backend (nodemon should already be running from earlier). Login and create a settlement with a partial amount:

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["token"])')

# Get a valid centerId
CENTER=$(curl -s http://localhost:3001/api/v1/admin/centers \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["data"]["data"][0]["id"])')

echo "centerId: $CENTER"
```

Then create a settlement with a partial `settledAmount` (use tomorrow's date to avoid duplicate conflict):

```bash
curl -s -X POST http://localhost:3001/api/v1/settlements \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"centerId\":\"$CENTER\",\"settlementDate\":\"2099-01-01\",\"carryForwardAmount\":0,\"settledAmount\":50}" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; print("finalAmount:", d["finalAmount"], "settledAmount:", d["settledAmount"], "remainingAmount:", d["remainingAmount"])'
```

Expected output (values depend on income for that date — 2099 likely has 0 income):
```
finalAmount: 0 settledAmount: 0 remainingAmount: 0
```

If using a real date with income (e.g. today but there's already a settlement — skip if conflict), the key check is `settledAmount + remainingAmount == finalAmount`.

Clean up the test record:
```bash
SETTLE_ID=$(curl -s -X POST http://localhost:3001/api/v1/settlements \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"centerId\":\"$CENTER\",\"settlementDate\":\"2099-01-02\",\"carryForwardAmount\":1000,\"settledAmount\":600}" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; print(d["id"], "| settled:", d["settledAmount"], "remaining:", d["remainingAmount"])')
echo $SETTLE_ID
```

Expected: `<uuid> | settled: 600 remaining: 400`

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/settlements/settlement.service.ts
git commit -m "feat(settlements): compute and persist settledAmount and remainingAmount on create"
```

---

## Task 4: Frontend types — add new fields to Settlement interface

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add the two fields**

In `frontend/src/types/index.ts`, find the `Settlement` interface (currently around line 156). Add `settledAmount` and `remainingAmount` after `finalAmount`:

```typescript
export interface Settlement {
  id: string;
  settlementNumber: string;
  centerId: string;
  userId: string;
  settlementDate: string;
  createdAt?: string;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  carryForwardAmount: number;
  finalAmount: number;
  settledAmount: number;
  remainingAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  notes?: string;
  center?: Center;
  user?: Partial<User>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat(types): add settledAmount and remainingAmount to Settlement interface"
```

---

## Task 5: Frontend UI — Settled Amount input, updated summary, history column, carry-forward fix

**Files:**
- Modify: `frontend/src/features/settlements/SettlementsPage.tsx`

This task has four sub-changes. Apply them all before committing.

### 5a — Add settledAmount to form state and carry-forward auto-fill

- [ ] **Step 1: Add settledAmount to form state**

Find the `form` state declaration (around line 102):

```typescript
const [form, setForm] = useState({
  centerId: user?.centers?.[0]?.id || '',
  settlementDate: format(new Date(), 'yyyy-MM-dd'),
  carryForwardAmount: '0',
  notes: '',
});
```

Replace with:

```typescript
const [form, setForm] = useState({
  centerId: user?.centers?.[0]?.id || '',
  settlementDate: format(new Date(), 'yyyy-MM-dd'),
  carryForwardAmount: '0',
  settledAmount: '',
  notes: '',
});
```

(`settledAmount` starts empty — it gets populated after preview is calculated.)

- [ ] **Step 2: Update the carry-forward auto-fill to use remainingAmount**

Find the `handleCalculate` function. The block that auto-fills carry-forward currently reads `list[0].finalAmount`. Replace the entire auto-fill block:

```typescript
// Auto-fill carry forward from last approved settlement's remainingAmount
if (prevSettlementRes.status === 'fulfilled') {
  const payload = prevSettlementRes.value.data?.data;
  const list = Array.isArray(payload) ? payload : (payload?.data ?? []);
  if (list.length > 0) {
    const lastRemaining = Number(list[0].remainingAmount ?? 0);
    setForm((f) => ({ ...f, carryForwardAmount: String(lastRemaining) }));
  } else {
    setForm((f) => ({ ...f, carryForwardAmount: '0' }));
  }
}
```

Also, after the preview is set (`setPreview({...})`), reset `settledAmount` to empty so it recalculates when finalAmount is known:

```typescript
setPreview({
  totalIncome: d.totalIncome ?? 0,
  totalExpenses: d.totalExpenses ?? 0,
  netAmount: d.netAmount ?? 0,
});
setForm((f) => ({ ...f, settledAmount: '' }));
```

### 5b — Add Settled Amount input and update summary card

- [ ] **Step 3: Add a computed finalAmount variable for use in the JSX**

At the top of the `{preview && (` block (just before the `<Grid item xs={12}>` that wraps the Paper), add a computed value. Since this is JSX, add it as a variable right before the `return` statement is too far away — instead, compute it inline where needed. We'll use it in two places below.

Find `handleSubmitSettlement` — it already computes `preview.netAmount + parseFloat(form.carryForwardAmount || '0')`. We'll use the same formula inline in JSX.

- [ ] **Step 4: Update the summary card to show Settled Now and Remaining**

Find the summary `<Paper>` block inside `{preview && (...)}`. It currently has 5 `<Grid item>` cells (Total Income, Total Expenses, Net Amount, Carry Forward, Final Amount). Replace the entire `<Grid container spacing={2}>` inside the Paper with:

```tsx
<Grid container spacing={2}>
  <Grid item xs={6} sm={2}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary">Total Income</Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
        {formatCurrency(preview.totalIncome)}
      </Typography>
    </Box>
  </Grid>
  <Grid item xs={6} sm={2}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary">Total Expenses</Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#ef4444' }}>
        {formatCurrency(preview.totalExpenses)}
      </Typography>
    </Box>
  </Grid>
  <Grid item xs={6} sm={2}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary">Net Amount</Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#6366f1' }}>
        {formatCurrency(preview.netAmount)}
      </Typography>
    </Box>
  </Grid>
  <Grid item xs={6} sm={2}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary">Carry Forward</Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#f59e0b' }}>
        {formatCurrency(parseFloat(form.carryForwardAmount) || 0)}
      </Typography>
    </Box>
  </Grid>
  <Grid item xs={6} sm={2}>
    <Box sx={{ textAlign: 'center', borderLeft: { sm: '1px solid #e2e8f0' }, pl: { sm: 2 } }}>
      <Typography variant="caption" color="text.secondary">Final Amount</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#000666' }}>
        {formatCurrency(preview.netAmount + (parseFloat(form.carryForwardAmount) || 0))}
      </Typography>
      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem' }}>
        Net + Carry Forward
      </Typography>
    </Box>
  </Grid>
  {(() => {
    const finalAmt = preview.netAmount + (parseFloat(form.carryForwardAmount) || 0);
    const settledAmt = form.settledAmount !== '' ? Math.min(parseFloat(form.settledAmount) || 0, finalAmt) : finalAmt;
    const remainingAmt = finalAmt - settledAmt;
    return (
      <>
        <Grid item xs={6} sm={2}>
          <Box sx={{ textAlign: 'center', borderLeft: { sm: '1px solid #e2e8f0' }, pl: { sm: 2 } }}>
            <Typography variant="caption" color="text.secondary">Settled Now</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#10b981' }}>
              {formatCurrency(settledAmt)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={2}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Remaining</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: remainingAmt > 0 ? '#f59e0b' : '#94a3b8' }}>
              {formatCurrency(remainingAmt)}
            </Typography>
            {remainingAmt > 0 && (
              <Typography variant="caption" sx={{ color: '#f59e0b', fontSize: '0.68rem' }}>
                carries to next
              </Typography>
            )}
          </Box>
        </Grid>
      </>
    );
  })()}
</Grid>
```

- [ ] **Step 5: Add the Settled Amount input field**

Find the Carry Forward `<Grid item xs={12} sm={6}>` input. After it (before the Notes field), add:

```tsx
<Grid item xs={12} sm={6}>
  {(() => {
    const finalAmt = preview.netAmount + (parseFloat(form.carryForwardAmount) || 0);
    return (
      <TextField
        fullWidth
        label="Settled Amount"
        name="settledAmount"
        type="number"
        value={form.settledAmount}
        onChange={handleFormChange}
        helperText={`Leave blank to settle full amount (${formatCurrency(finalAmt)})`}
        inputProps={{ min: 0, max: finalAmt, step: 1 }}
        InputProps={{
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        }}
      />
    );
  })()}
</Grid>
```

### 5c — Pass settledAmount in the submit payload

- [ ] **Step 6: Update handleSubmitSettlement to include settledAmount**

Find `handleSubmitSettlement`. Replace the `dispatch(createSettlement({...}))` call with:

```typescript
const finalAmt = preview.netAmount + parseFloat(form.carryForwardAmount || '0');
const settledAmt = form.settledAmount !== '' ? parseFloat(form.settledAmount) : undefined;

await dispatch(
  createSettlement({
    ...form,
    carryForwardAmount: parseFloat(form.carryForwardAmount),
    totalIncome: preview.totalIncome,
    totalExpenses: preview.totalExpenses,
    netAmount: preview.netAmount,
    finalAmount: finalAmt,
    ...(settledAmt !== undefined && { settledAmount: settledAmt }),
  })
).unwrap();
```

Also reset `settledAmount` when the form resets after a successful submit:

```typescript
setForm({
  centerId: user?.centers?.[0]?.id || '',
  settlementDate: format(new Date(), 'yyyy-MM-dd'),
  carryForwardAmount: '0',
  settledAmount: '',
  notes: '',
});
```

### 5d — Add Remaining column to history table

- [ ] **Step 7: Add Remaining column header to desktop table**

Find the desktop `<TableHead>` in the history tab. After the `<TableCell>Status</TableCell>` cell (and before `<TableCell align="center">Actions</TableCell>`), add:

```tsx
<TableCell>Remaining</TableCell>
```

- [ ] **Step 8: Add Remaining column cell to each desktop table row**

In the `.map((s) => {...})` for desktop rows, find the Status cell:

```tsx
<TableCell><Chip label={sc.label} size="small" .../></TableCell>
```

After it, add:

```tsx
<TableCell>
  {Number(s.remainingAmount) > 0 ? (
    <Typography variant="body2" sx={{ fontWeight: 700, color: '#f59e0b' }}>
      {formatCurrency(Number(s.remainingAmount))}
    </Typography>
  ) : (
    <Typography variant="body2" sx={{ color: '#94a3b8' }}>—</Typography>
  )}
</TableCell>
```

- [ ] **Step 9: Update skeleton and empty-state colSpan**

The skeleton rows currently use `isAdmin ? 8 : 7` columns. Change to `isAdmin ? 9 : 8`:

```tsx
{Array.from({ length: isAdmin ? 9 : 8 }).map((__, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}
```

The empty-state colSpan: change `isAdmin ? 8 : 7` to `isAdmin ? 9 : 8`:

```tsx
<TableCell colSpan={isAdmin ? 9 : 8} align="center" sx={{ py: 5 }}>
```

- [ ] **Step 10: Add Remaining to mobile card view**

In the mobile card's grid (the `<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', ...}}>` with Income/Expenses/Net), add a fourth item after Net:

```tsx
{Number(s.remainingAmount) > 0 && (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Remaining</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(Number(s.remainingAmount))}</Typography>
  </Box>
)}
```

- [ ] **Step 11: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 12: Commit**

```bash
git add frontend/src/features/settlements/SettlementsPage.tsx
git commit -m "feat(settlements): add partial settlement UI — settled amount input, remaining column, carry-forward fix"
```

---

## Task 6: End-to-end smoke test in browser

- [ ] **Step 1: Confirm both servers are running**

```bash
curl -s http://localhost:3001/health | python3 -c 'import sys,json; print(json.load(sys.stdin)["status"])'
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
```

Expected: `OK` and `200`.

- [ ] **Step 2: Open the Settlements page and create a partial settlement**

1. Navigate to http://localhost:5173/settlements
2. On the "Create Settlement" tab, select a center and today's date
3. Click **Calculate Settlement** — the summary card should appear
4. In the **Settled Amount** field, enter an amount less than the Final Amount (e.g. if Final is ₹1,200, enter ₹600)
5. Observe that **Settled Now** shows ₹600 and **Remaining** shows ₹600 (in amber) with "carries to next" label
6. Submit — the new settlement should appear in the history tab
7. Check the **Remaining** column for that row — it should show ₹600 in amber

- [ ] **Step 3: Verify carry-forward auto-fill on next settlement**

1. Switch to a different date or center to create another settlement
2. Click **Calculate Settlement** — the carry-forward field should be auto-filled with ₹600 (the remaining from the previous partial settlement)

- [ ] **Step 4: Commit**

```bash
git add -p  # stage any last-minute fixes
git commit -m "fix(settlements): smoke-test corrections" --allow-empty
git push origin main
```

---

## Self-review notes

- Spec requirement "settledAmount defaults to finalAmount if omitted" → covered in Task 3 Step 1 (`dto.settledAmount !== undefined ? ... : finalAmount`)
- Spec requirement "carry-forward uses remainingAmount from last settlement" → covered in Task 5a Step 2
- Spec requirement "Remaining column in history table" → covered in Tasks 5d Steps 7-10
- Spec requirement "no new settlement status" → no status changes anywhere in this plan ✓
- Type consistency: `settledAmount` / `remainingAmount` used consistently across Tasks 1–5 ✓
