# Settlement Rejected Carry-Forward & Sequencing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Anchor settlement carry-forward and sequencing on the last APPROVED settlement; block creation while a settlement is PENDING; allow re-settling REJECTED days (delete & recreate, carry-forward reset to last approved).

**Architecture:** All logic lives in `backend/src/modules/settlements/settlement.service.ts` (`create`, `batchPreview`, `createBatch`). A small frontend tweak surfaces the block message. No schema/endpoint changes.

**Tech Stack:** Prisma/TypeScript backend, React + Redux + MUI frontend.

---

### Task 1: `create()` — anchor on last approved, pending block, re-settle

**Files:** `backend/src/modules/settlements/settlement.service.ts`

- [ ] **Step 1:** Replace the body of `create()` from after `await assertCenterAccess(...)` through `return settlement;` (the block that starts `const settlementDate = new Date(dto.settlementDate);` and ends `return settlement;`) with:

```typescript
    const settlementDate = new Date(dto.settlementDate);
    const startOfDay = new Date(settlementDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(settlementDate);
    endOfDay.setHours(23, 59, 59, 999);
    const newDay = new Date(settlementDate);
    newDay.setHours(0, 0, 0, 0);

    // Carry-forward anchors on the last APPROVED settlement only
    const lastApproved = await prisma.settlement.findFirst({
      where: { centerId: dto.centerId, status: 'APPROVED' },
      orderBy: { settlementDate: 'desc' },
    });
    const carryForwardAmount = lastApproved ? Number(lastApproved.remainingAmount) : 0;

    // Block while a settlement after the last approved is still PENDING
    const pending = await prisma.settlement.findFirst({
      where: {
        centerId: dto.centerId,
        status: 'PENDING',
        ...(lastApproved ? { settlementDate: { gt: lastApproved.settlementDate } } : {}),
      },
      orderBy: { settlementDate: 'asc' },
    });
    if (pending) {
      throw ApiError.badRequest(
        `Settlement for ${pending.settlementDate.toISOString().slice(0, 10)} is pending approval. Approve or reject it before creating a new one.`
      );
    }

    // Determine the window start (first settleable / re-settleable date)
    let windowStartDate: Date | null;
    if (lastApproved) {
      windowStartDate = new Date(lastApproved.settlementDate);
      windowStartDate.setHours(0, 0, 0, 0);
      windowStartDate.setDate(windowStartDate.getDate() + 1);
    } else {
      const earliest = await prisma.settlement.findFirst({
        where: { centerId: dto.centerId },
        orderBy: { settlementDate: 'asc' },
      });
      if (earliest) {
        windowStartDate = new Date(earliest.settlementDate);
        windowStartDate.setHours(0, 0, 0, 0);
      } else {
        windowStartDate = null;
      }
    }

    if (windowStartDate) {
      if (newDay.getTime() < windowStartDate.getTime()) {
        throw ApiError.badRequest('Cannot settle a date on or before an already-approved settlement.');
      }
      if (newDay.getTime() > windowStartDate.getTime()) {
        throw ApiError.badRequest('Settle earlier pending days first — use batch creation.');
      }
    }

    // Existing record on the requested date: replace only if REJECTED
    const existing = await prisma.settlement.findFirst({
      where: { centerId: dto.centerId, settlementDate: { gte: startOfDay, lte: endOfDay } },
    });
    if (existing && existing.status !== 'REJECTED') {
      throw ApiError.conflict('A settlement already exists for this center on this date');
    }
    const rejectedToReplaceId = existing && existing.status === 'REJECTED' ? existing.id : null;

    const { totalIncome, totalExpenses, netAmount } = await aggregateDayFinancials(
      dto.centerId,
      settlementDate
    );
    const finalAmount = netAmount + carryForwardAmount;
    const settledAmount =
      dto.settledAmount !== undefined ? Math.min(dto.settledAmount, finalAmount) : finalAmount;
    const remainingAmount = finalAmount - settledAmount;
    const settlementNumber = `SET${Date.now()}`;

    const settlement = await prisma.$transaction(async (tx) => {
      if (rejectedToReplaceId) {
        await tx.settlement.delete({ where: { id: rejectedToReplaceId } });
      }
      return tx.settlement.create({
        data: {
          settlementNumber,
          centerId: dto.centerId,
          userId,
          settlementDate,
          totalIncome,
          totalExpenses,
          netAmount,
          carryForwardAmount,
          finalAmount,
          settledAmount,
          remainingAmount,
          status: 'PENDING',
          notes: dto.notes,
        },
        include: settlementInclude,
      });
    });

    return settlement;
```

- [ ] **Step 2:** `cd backend && npx tsc --noEmit` → no errors. Commit:
```bash
git add backend/src/modules/settlements/settlement.service.ts
git commit -m "fix(settlements): create() anchors carry-forward on last approved; block pending; re-settle rejected"
```

---

### Task 2: `batchPreview()` — anchor on last approved, pending block, window start

**Files:** `backend/src/modules/settlements/settlement.service.ts`

- [ ] **Step 1:** In `batchPreview()`, replace this block:

```typescript
    const lastSettlement = await prisma.settlement.findFirst({
      where: { centerId },
      orderBy: { settlementDate: 'desc' },
    });

    let startDateObj: Date;
    let initialCarryForward: number;

    if (lastSettlement) {
      startDateObj = new Date(lastSettlement.settlementDate);
      startDateObj.setHours(0, 0, 0, 0);
      startDateObj.setDate(startDateObj.getDate() + 1);
      initialCarryForward = Number(lastSettlement.remainingAmount);
    } else {
      startDateObj = new Date(endDateObj);
      initialCarryForward = 0;
    }

    if (startDateObj > endDateObj) {
      return [];
    }
```

with:

```typescript
    const lastApproved = await prisma.settlement.findFirst({
      where: { centerId, status: 'APPROVED' },
      orderBy: { settlementDate: 'desc' },
    });

    // Block while a settlement after the last approved is still PENDING
    const pending = await prisma.settlement.findFirst({
      where: {
        centerId,
        status: 'PENDING',
        ...(lastApproved ? { settlementDate: { gt: lastApproved.settlementDate } } : {}),
      },
      orderBy: { settlementDate: 'asc' },
    });
    if (pending) {
      throw ApiError.badRequest(
        `Settlement for ${pending.settlementDate.toISOString().slice(0, 10)} is pending approval. Approve or reject it before creating a new one.`
      );
    }

    let startDateObj: Date;
    let initialCarryForward: number;

    if (lastApproved) {
      startDateObj = new Date(lastApproved.settlementDate);
      startDateObj.setHours(0, 0, 0, 0);
      startDateObj.setDate(startDateObj.getDate() + 1);
      initialCarryForward = Number(lastApproved.remainingAmount);
    } else {
      const earliest = await prisma.settlement.findFirst({
        where: { centerId },
        orderBy: { settlementDate: 'asc' },
      });
      if (earliest) {
        startDateObj = new Date(earliest.settlementDate);
        startDateObj.setHours(0, 0, 0, 0);
      } else {
        startDateObj = new Date(endDateObj);
      }
      initialCarryForward = 0;
    }

    if (startDateObj > endDateObj) {
      return [];
    }
```

- [ ] **Step 2:** `cd backend && npx tsc --noEmit` → no errors. Commit:
```bash
git add backend/src/modules/settlements/settlement.service.ts
git commit -m "fix(settlements): batchPreview() anchors on last approved; block pending; window start covers rejected days"
```

---

### Task 3: `createBatch()` — delete rejected in range before recreating

**Files:** `backend/src/modules/settlements/settlement.service.ts`

- [ ] **Step 1:** In `createBatch()`, inside the `prisma.$transaction(async (tx) => {` callback, insert a deleteMany BEFORE `const ids: string[] = [];`. Replace:

```typescript
      async (tx) => {
        const ids: string[] = [];
```

with:

```typescript
      async (tx) => {
        // Re-settle: remove any rejected settlements in this range so they can be recreated
        await tx.settlement.deleteMany({
          where: {
            centerId: dto.centerId,
            status: 'REJECTED',
            settlementDate: {
              gte: new Date(days[0].date),
              lte: new Date(days[days.length - 1].date),
            },
          },
        });
        const ids: string[] = [];
```

- [ ] **Step 2:** `cd backend && npx tsc --noEmit` → no errors. Commit:
```bash
git add backend/src/modules/settlements/settlement.service.ts
git commit -m "fix(settlements): createBatch() deletes rejected settlements in range before recreating"
```

---

### Task 4: Frontend — surface the block/preview error in the Create tab

**Files:** `frontend/src/features/settlements/settlementSlice.ts`, `frontend/src/features/settlements/SettlementsPage.tsx`

- [ ] **Step 1:** In `settlementSlice.ts`, add `batchPreviewError` to the `SettlementState` interface (after `batchPreviewLoading: boolean;`):
```typescript
  batchPreviewError: string | null;
```
and to `initialState` (after `batchPreviewLoading: false,`):
```typescript
  batchPreviewError: null,
```

- [ ] **Step 2:** In the `clearBatchPreview` reducer, also clear the error. Replace:
```typescript
    clearBatchPreview: (state) => {
      state.batchPreviewDays = null;
      state.batchPreviewLoading = false;
    },
```
with:
```typescript
    clearBatchPreview: (state) => {
      state.batchPreviewDays = null;
      state.batchPreviewLoading = false;
      state.batchPreviewError = null;
    },
```

- [ ] **Step 3:** Update the three `fetchBatchPreview` extraReducers. Replace:
```typescript
      .addCase(fetchBatchPreview.pending, (state) => {
        state.batchPreviewLoading = true;
        state.error = null;
      })
      .addCase(fetchBatchPreview.fulfilled, (state, action) => {
        state.batchPreviewLoading = false;
        state.batchPreviewDays = action.payload;
      })
      .addCase(fetchBatchPreview.rejected, (state, action) => {
        state.batchPreviewLoading = false;
        state.error = action.payload as string;
      })
```
with:
```typescript
      .addCase(fetchBatchPreview.pending, (state) => {
        state.batchPreviewLoading = true;
        state.error = null;
        state.batchPreviewError = null;
      })
      .addCase(fetchBatchPreview.fulfilled, (state, action) => {
        state.batchPreviewLoading = false;
        state.batchPreviewDays = action.payload;
        state.batchPreviewError = null;
      })
      .addCase(fetchBatchPreview.rejected, (state, action) => {
        state.batchPreviewLoading = false;
        state.batchPreviewDays = null;
        state.batchPreviewError = action.payload as string;
      })
```

- [ ] **Step 4:** In `SettlementsPage.tsx`, add `batchPreviewError` to the settlements selector. Replace:
```typescript
  const { settlements, loading, pagination, batchPreviewDays, batchPreviewLoading } = useAppSelector((state) => state.settlements);
```
with:
```typescript
  const { settlements, loading, pagination, batchPreviewDays, batchPreviewLoading, batchPreviewError } = useAppSelector((state) => state.settlements);
```

- [ ] **Step 5:** In `SettlementsPage.tsx`, render the error in the Create tab. Find the loading-indicator block:
```tsx
              {/* Loading indicator */}
              {batchPreviewLoading && batchPreviewDays === null && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                </Grid>
              )}
```
and insert immediately AFTER it:
```tsx
              {/* Block / preview error */}
              {batchPreviewError && !batchPreviewLoading && (
                <Grid item xs={12}>
                  <Alert severity="warning">{batchPreviewError}</Alert>
                </Grid>
              )}
```

- [ ] **Step 6:** `cd frontend && npx tsc --noEmit` → no errors. Commit:
```bash
git add frontend/src/features/settlements/settlementSlice.ts frontend/src/features/settlements/SettlementsPage.tsx
git commit -m "feat(settlements): surface batch-preview block message (pending approval) in Create tab"
```
