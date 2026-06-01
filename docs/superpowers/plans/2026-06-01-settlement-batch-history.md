# Settlement Batch History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show batch-created settlements as a single collapsed row in history with aggregated financials and bulk approve/reject/delete actions for admins.

**Architecture:** Add a nullable `batchId` column to `settlements`, stamp it in `createBatch`, add three batch action endpoints, group by `batchId` in `findAll`, and render a distinct batch row in the frontend history table.

**Tech Stack:** PostgreSQL + Prisma, Node/Express + TypeScript (backend), React + Redux Toolkit + MUI (frontend).

---

### Task 1: Add `batchId` to schema and run migration

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add `batchId` field and index to Settlement model**

In `backend/prisma/schema.prisma`, replace the `Settlement` model with:

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
  batchId            String?          @db.Char(36)
  createdAt          DateTime         @default(now())

  center       Center        @relation(fields: [centerId], references: [id])
  user         User          @relation("CreatedBy", fields: [userId], references: [id])
  approver     User?         @relation("ApprovedBy", fields: [approvedBy], references: [id])
  editRequests EditRequest[]

  @@unique([centerId, settlementDate])
  @@index([centerId, settlementDate])
  @@index([status])
  @@index([batchId])
  @@map("settlements")
}
```

- [ ] **Step 2: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_batch_id_to_settlements
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(settlements): add batchId column to settlements table"
```

---

### Task 2: Stamp `batchId` in `createBatch`

**Files:**
- Modify: `backend/src/modules/settlements/settlement.service.ts`

- [ ] **Step 1: Add `randomUUID` import**

At the top of `backend/src/modules/settlements/settlement.service.ts`, add after the existing imports:

```typescript
import { randomUUID } from 'crypto';
```

- [ ] **Step 2: Generate `batchId` and stamp all settlements in the transaction**

In `createBatch`, immediately after `let remainingBudget = targetSettled;`, add:

```typescript
const batchId = randomUUID();
```

Then in the `tx.settlement.create` data object inside the loop, add `batchId` after `status: 'PENDING'`:

```typescript
const { id } = await tx.settlement.create({
  data: {
    settlementNumber,
    centerId: dto.centerId,
    userId,
    settlementDate,
    totalIncome: day.totalIncome,
    totalExpenses: day.totalExpenses,
    netAmount: day.netAmount,
    carryForwardAmount: day.carryForwardAmount,
    finalAmount: day.finalAmount,
    settledAmount,
    remainingAmount,
    status: 'PENDING',
    batchId,
    notes: dto.notes,
  },
  select: { id: true },
});
```

- [ ] **Step 3: Verify backend starts without TypeScript errors**

```bash
cd backend && npm run dev
```

Expected: `🚀 Server running on port 3001`

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/settlements/settlement.service.ts
git commit -m "feat(settlements): stamp batchId UUID on createBatch settlements"
```

---

### Task 3: Add service types + `aggregateBatchGroup` helper

**Files:**
- Modify: `backend/src/modules/settlements/settlement.service.ts`

- [ ] **Step 1: Add `Prisma` import**

Add to the imports at the top of `settlement.service.ts`:

```typescript
import { Prisma } from '@prisma/client';
```

- [ ] **Step 2: Add type aliases after the `settlementInclude` constant**

After the closing `};` of the `settlementInclude` constant, add:

```typescript
type SettlementWithRelations = Prisma.SettlementGetPayload<{ include: typeof settlementInclude }>;

type BatchGroup = {
  type: 'batch';
  batchId: string;
  centerId: string;
  centerName: string;
  startDate: string;
  endDate: string;
  count: number;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  settledAmount: number;
  remainingAmount: number;
  finalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
};

type SettlementListItem =
  | ({ type: 'individual' } & SettlementWithRelations)
  | BatchGroup;
```

- [ ] **Step 3: Add `aggregateBatchGroup` as the first method inside the `SettlementService` class**

```typescript
private aggregateBatchGroup(records: SettlementWithRelations[]): BatchGroup {
  const sorted = [...records].sort(
    (a, b) => new Date(a.settlementDate).getTime() - new Date(b.settlementDate).getTime()
  );
  const toDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return {
    type: 'batch',
    batchId: sorted[0].batchId!,
    centerId: sorted[0].centerId,
    centerName: sorted[0].center?.centerName ?? '',
    startDate: toDateStr(new Date(sorted[0].settlementDate)),
    endDate: toDateStr(new Date(sorted[sorted.length - 1].settlementDate)),
    count: sorted.length,
    totalIncome: sorted.reduce((s, r) => s + Number(r.totalIncome), 0),
    totalExpenses: sorted.reduce((s, r) => s + Number(r.totalExpenses), 0),
    netAmount: sorted.reduce((s, r) => s + Number(r.netAmount), 0),
    settledAmount: sorted.reduce((s, r) => s + Number(r.settledAmount), 0),
    remainingAmount: sorted.reduce((s, r) => s + Number(r.remainingAmount), 0),
    finalAmount: sorted.reduce((s, r) => s + Number(r.finalAmount), 0),
    status: sorted[0].status,
    createdAt: sorted[sorted.length - 1].createdAt.toISOString(),
  };
}
```

- [ ] **Step 4: Verify backend still starts**

```bash
cd backend && npm run dev
```

Expected: `🚀 Server running on port 3001`

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/settlements/settlement.service.ts
git commit -m "feat(settlements): add BatchGroup types and aggregateBatchGroup helper"
```

---

### Task 4: Add batch action service methods

**Files:**
- Modify: `backend/src/modules/settlements/settlement.service.ts`

- [ ] **Step 1: Add `approveBatch` method after the existing `approve` method**

```typescript
async approveBatch(batchId: string, adminId: string): Promise<BatchGroup> {
  const records = await prisma.settlement.findMany({
    where: { batchId },
    include: settlementInclude,
  });
  if (records.length === 0) throw ApiError.notFound('Batch not found');
  const pendingIds = records.filter((r) => r.status === 'PENDING').map((r) => r.id);
  if (pendingIds.length === 0) throw ApiError.badRequest('No pending settlements in this batch');
  await prisma.settlement.updateMany({
    where: { id: { in: pendingIds } },
    data: { status: 'APPROVED', approvedBy: adminId, approvedAt: new Date() },
  });
  const updated = await prisma.settlement.findMany({
    where: { batchId },
    include: settlementInclude,
  });
  return this.aggregateBatchGroup(updated);
}
```

- [ ] **Step 2: Add `rejectBatch` method after `approveBatch`**

```typescript
async rejectBatch(batchId: string, adminId: string, notes: string): Promise<BatchGroup> {
  const records = await prisma.settlement.findMany({
    where: { batchId },
    include: settlementInclude,
  });
  if (records.length === 0) throw ApiError.notFound('Batch not found');
  const pendingIds = records.filter((r) => r.status === 'PENDING').map((r) => r.id);
  if (pendingIds.length === 0) throw ApiError.badRequest('No pending settlements in this batch');
  await prisma.settlement.updateMany({
    where: { id: { in: pendingIds } },
    data: { status: 'REJECTED', approvedBy: adminId, notes },
  });
  const updated = await prisma.settlement.findMany({
    where: { batchId },
    include: settlementInclude,
  });
  return this.aggregateBatchGroup(updated);
}
```

- [ ] **Step 3: Add `deleteBatch` method after `rejectBatch`**

```typescript
async deleteBatch(batchId: string): Promise<string> {
  const count = await prisma.settlement.count({ where: { batchId } });
  if (count === 0) throw ApiError.notFound('Batch not found');
  await prisma.settlement.deleteMany({ where: { batchId } });
  return batchId;
}
```

- [ ] **Step 4: Verify backend still starts**

```bash
cd backend && npm run dev
```

Expected: `🚀 Server running on port 3001`

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/settlements/settlement.service.ts
git commit -m "feat(settlements): add approveBatch, rejectBatch, deleteBatch service methods"
```

---

### Task 5: Add batch action controller handlers and routes

**Files:**
- Modify: `backend/src/modules/settlements/settlement.controller.ts`
- Modify: `backend/src/modules/settlements/settlement.routes.ts`

- [ ] **Step 1: Add three controller handlers to `SettlementController`**

In `settlement.controller.ts`, add after the `reject` handler and before `deleteSettlement`:

```typescript
approveBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await settlementService.approveBatch(req.params.batchId, req.user!.userId);
  res.json(ApiResponse.success(result, 'Batch approved successfully'));
});

rejectBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await settlementService.rejectBatch(
    req.params.batchId,
    req.user!.userId,
    req.body.notes || ''
  );
  res.json(ApiResponse.success(result, 'Batch rejected'));
});

deleteBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  await settlementService.deleteBatch(req.params.batchId);
  res.json(ApiResponse.success(null, 'Batch deleted'));
});
```

- [ ] **Step 2: Add three routes to `settlement.routes.ts`**

In `settlement.routes.ts`, add before `router.get('/:id', ...)`:

```typescript
router.put('/batch/:batchId/approve', authenticate, requireRole('ADMIN'), settlementController.approveBatch);
router.put('/batch/:batchId/reject', authenticate, requireRole('ADMIN'), settlementController.rejectBatch);
router.delete('/batch/:batchId', authenticate, requireRole('ADMIN'), settlementController.deleteBatch);
```

The full routes file should now look like:

```typescript
router.get('/preview', authenticate, settlementController.preview);
router.get('/batch-preview', authenticate, settlementController.batchPreview);
router.post('/batch', authenticate, settlementController.createBatch);
router.post('/', authenticate, settlementController.create);
router.get('/', authenticate, settlementController.findAll);
router.get('/:id', authenticate, settlementController.findById);
router.put('/:id/approve', authenticate, requireRole('ADMIN'), settlementController.approve);
router.put('/:id/reject', authenticate, requireRole('ADMIN'), settlementController.reject);
router.delete('/:id', authenticate, requireRole('ADMIN'), settlementController.deleteSettlement);
router.put('/batch/:batchId/approve', authenticate, requireRole('ADMIN'), settlementController.approveBatch);
router.put('/batch/:batchId/reject', authenticate, requireRole('ADMIN'), settlementController.rejectBatch);
router.delete('/batch/:batchId', authenticate, requireRole('ADMIN'), settlementController.deleteBatch);
```

- [ ] **Step 3: Verify backend starts and endpoints exist**

```bash
cd backend && npm run dev
# In a second terminal:
curl -s http://localhost:3001/health | jq .
```

Expected: `{ "status": "ok" }` (or similar health response)

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/settlements/settlement.controller.ts \
        backend/src/modules/settlements/settlement.routes.ts
git commit -m "feat(settlements): add batch approve/reject/delete controller and routes"
```

---

### Task 6: Update `findAll` to group settlements by `batchId`

**Files:**
- Modify: `backend/src/modules/settlements/settlement.service.ts`

- [ ] **Step 1: Replace the `findAll` method body**

Replace the entire `findAll` method in `settlement.service.ts` with:

```typescript
async findAll(userId: string, role: string, filters: SettlementFiltersDto) {
  const { centerId, status, startDate, endDate, search, sortBy, sortOrder, page, limit } = filters;

  const where: Record<string, unknown> = {
    ...(await buildCenterWhereClause(userId, role, centerId)),
  };

  if (status) where.status = status;
  if (startDate && endDate) {
    where.settlementDate = { gte: new Date(startDate), lte: new Date(endDate) };
  } else if (startDate) {
    where.settlementDate = { gte: new Date(startDate) };
  } else if (endDate) {
    where.settlementDate = { lte: new Date(endDate) };
  }
  if (search) where.settlementNumber = { contains: search };

  const [rawData, total] = await Promise.all([
    prisma.settlement.findMany({
      where,
      include: settlementInclude,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.settlement.count({ where }),
  ]);

  // Collect distinct batchIds on this page
  const batchIds = [
    ...new Set(rawData.filter((s) => s.batchId).map((s) => s.batchId as string)),
  ];

  // Fetch all settlements belonging to those batchIds (may include off-page records)
  const batchGroupMap = new Map<string, SettlementWithRelations[]>();
  if (batchIds.length > 0) {
    const allBatchRecords = await prisma.settlement.findMany({
      where: { batchId: { in: batchIds } },
      include: settlementInclude,
      orderBy: { settlementDate: 'desc' },
    });
    for (const record of allBatchRecords) {
      if (!record.batchId) continue;
      const list = batchGroupMap.get(record.batchId) ?? [];
      list.push(record);
      batchGroupMap.set(record.batchId, list);
    }
  }

  // Build result: show batch group on the page where the most-recent member appears
  const pageIds = new Set(rawData.map((s) => s.id));
  const emittedBatchIds = new Set<string>();
  const data: SettlementListItem[] = [];

  for (const s of rawData) {
    if (!s.batchId) {
      data.push({ type: 'individual', ...s });
    } else if (!emittedBatchIds.has(s.batchId)) {
      const batchRecords = batchGroupMap.get(s.batchId) ?? [];
      // batchRecords sorted desc; [0] is the most-recent settlement (the anchor)
      const anchor = batchRecords[0];
      if (anchor && pageIds.has(anchor.id)) {
        data.push(this.aggregateBatchGroup(batchRecords));
        emittedBatchIds.add(s.batchId);
      }
      // anchor not on this page = batch was shown on an earlier page, skip
    }
    // duplicate batchId on same page = skip (already emitted)
  }

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

- [ ] **Step 2: Verify backend starts without TypeScript errors**

```bash
cd backend && npm run dev
```

Expected: `🚀 Server running on port 3001` with no TypeScript compilation errors.

- [ ] **Step 3: Smoke-test `findAll` with curl**

```bash
# Get a token first (replace credentials as needed)
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.accessToken')

curl -s "http://localhost:3001/api/v1/settlements?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.data[0].type'
```

Expected: `"individual"` or `"batch"` (not `null`).

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/settlements/settlement.service.ts
git commit -m "feat(settlements): group batch settlements in findAll response"
```

---

### Task 7: Update frontend types and settlementSlice

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/features/settlements/settlementSlice.ts`

- [ ] **Step 1: Add `batchId` to `Settlement` and add `BatchSettlementGroup` + `SettlementListItem`**

In `frontend/src/types/index.ts`, update the `Settlement` interface and add new types after it:

```typescript
export interface Settlement {
  type?: 'individual';
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
  batchId?: string;
  center?: Center;
  user?: Partial<User>;
}

export interface BatchSettlementGroup {
  type: 'batch';
  batchId: string;
  centerId: string;
  centerName: string;
  startDate: string;
  endDate: string;
  count: number;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  settledAmount: number;
  remainingAmount: number;
  finalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export type SettlementListItem = Settlement | BatchSettlementGroup;
```

- [ ] **Step 2: Update settlementSlice imports and state type**

In `frontend/src/features/settlements/settlementSlice.ts`, update the import from types:

```typescript
import type { Settlement, BatchSettlementGroup, SettlementListItem, ApiResponse } from '../../types';
```

Update `SettlementState`:

```typescript
interface SettlementState {
  settlements: SettlementListItem[];
  loading: boolean;
  error: string | null;
  pagination: { total: number; page: number; limit: number; totalPages: number } | null;
  batchPreviewDays: BatchPreviewDay[] | null;
  batchPreviewLoading: boolean;
}
```

- [ ] **Step 3: Update `fetchSettlements` thunk return type cast**

In the `fetchSettlements` thunk, change the cast on the data line:

```typescript
const data = (Array.isArray(payload) ? payload : payload?.data ?? []) as SettlementListItem[];
```

- [ ] **Step 4: Add `approveBatch`, `rejectBatch`, `deleteBatch` thunks**

Add after the existing `approveSettlement` thunk:

```typescript
export const approveBatch = createAsyncThunk(
  'settlements/approveBatch',
  async (batchId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.put<ApiResponse<BatchSettlementGroup>>(
        `/settlements/batch/${batchId}/approve`,
        {}
      );
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to approve batch');
    }
  }
);

export const rejectBatch = createAsyncThunk(
  'settlements/rejectBatch',
  async ({ batchId, notes }: { batchId: string; notes: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put<ApiResponse<BatchSettlementGroup>>(
        `/settlements/batch/${batchId}/reject`,
        { notes }
      );
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to reject batch');
    }
  }
);

export const deleteBatch = createAsyncThunk(
  'settlements/deleteBatch',
  async (batchId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/settlements/batch/${batchId}`);
      return batchId;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to delete batch');
    }
  }
);
```

- [ ] **Step 5: Update `approveSettlement`, `rejectSettlement`, `deleteSettlement` extraReducers to be type-safe**

Replace the three fulfilled handlers in `extraReducers`:

```typescript
.addCase(approveSettlement.fulfilled, (state, action: PayloadAction<Settlement>) => {
  const idx = state.settlements.findIndex(
    (s) => (s as Settlement).id === action.payload.id
  );
  if (idx !== -1) state.settlements[idx] = action.payload;
})
.addCase(rejectSettlement.fulfilled, (state, action: PayloadAction<Settlement>) => {
  const idx = state.settlements.findIndex(
    (s) => (s as Settlement).id === action.payload.id
  );
  if (idx !== -1) state.settlements[idx] = action.payload;
})
.addCase(deleteSettlement.fulfilled, (state, action: PayloadAction<string>) => {
  state.settlements = state.settlements.filter(
    (s) => (s as Settlement).id !== action.payload
  );
})
```

- [ ] **Step 6: Add batch action extraReducers**

Add after the `deleteSettlement.fulfilled` handler:

```typescript
.addCase(approveBatch.fulfilled, (state, action: PayloadAction<BatchSettlementGroup>) => {
  const idx = state.settlements.findIndex(
    (s) => s.type === 'batch' && s.batchId === action.payload.batchId
  );
  if (idx !== -1) state.settlements[idx] = action.payload;
})
.addCase(rejectBatch.fulfilled, (state, action: PayloadAction<BatchSettlementGroup>) => {
  const idx = state.settlements.findIndex(
    (s) => s.type === 'batch' && s.batchId === action.payload.batchId
  );
  if (idx !== -1) state.settlements[idx] = action.payload;
})
.addCase(deleteBatch.fulfilled, (state, action: PayloadAction<string>) => {
  state.settlements = state.settlements.filter(
    (s) => !(s.type === 'batch' && s.batchId === action.payload)
  );
})
```

- [ ] **Step 7: Verify frontend compiles without errors**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/types/index.ts \
        frontend/src/features/settlements/settlementSlice.ts
git commit -m "feat(settlements): add BatchSettlementGroup type and batch action thunks"
```

---

### Task 8: Render batch rows in SettlementsPage history tab

**Files:**
- Modify: `frontend/src/features/settlements/SettlementsPage.tsx`

- [ ] **Step 1: Add batch thunk imports**

In `SettlementsPage.tsx`, update the import from `./settlementSlice` to include the new thunks:

```typescript
import {
  fetchSettlements,
  createSettlement,
  approveSettlement,
  rejectSettlement,
  deleteSettlement,
  fetchBatchPreview,
  createBatchSettlements,
  clearBatchPreview,
  approveBatch,
  rejectBatch,
  deleteBatch,
  type BatchPreviewDay,
} from './settlementSlice';
```

Also update the type import:

```typescript
import type { Settlement, BatchSettlementGroup } from '../../types';
```

- [ ] **Step 2: Add batch state vars**

After the existing `const [rejectId, setRejectId] = useState<string | null>(null);` line, add:

```typescript
const [deleteBatchId, setDeleteBatchId] = useState<string | null>(null);
const [rejectBatchId, setRejectBatchId] = useState<string | null>(null);
```

- [ ] **Step 3: Add batch action handlers**

After the existing `handleDelete` function, add:

```typescript
const handleApproveBatch = async (batchId: string) => {
  try {
    await dispatch(approveBatch(batchId)).unwrap();
    setSnack({ open: true, msg: 'Batch approved!', severity: 'success' });
  } catch {
    setSnack({ open: true, msg: 'Failed to approve batch', severity: 'error' });
  }
};

const handleRejectBatch = async () => {
  if (!rejectBatchId) return;
  try {
    await dispatch(rejectBatch({ batchId: rejectBatchId, notes: rejectNotes })).unwrap();
    setSnack({ open: true, msg: 'Batch rejected.', severity: 'success' });
    setRejectBatchId(null);
    setRejectNotes('');
  } catch {
    setSnack({ open: true, msg: 'Failed to reject batch.', severity: 'error' });
  }
};

const handleDeleteBatch = async () => {
  if (!deleteBatchId) return;
  try {
    await dispatch(deleteBatch(deleteBatchId)).unwrap();
    setSnack({ open: true, msg: 'Batch deleted.', severity: 'success' });
  } catch {
    setSnack({ open: true, msg: 'Failed to delete batch.', severity: 'error' });
  } finally {
    setDeleteBatchId(null);
  }
};
```

- [ ] **Step 4: Replace desktop table body map with type-discriminated render**

Find the desktop `TableBody` section that starts with:
```tsx
{loading
  ? Array.from({ length: 5 }).map(...)
  : settlements.length === 0
  ? (...)
  : settlements.map((s) => {
      const sc = statusConfig[s.status];
      return (
        <TableRow key={s.id} hover>
```

Replace the `settlements.map(...)` branch with:

```tsx
: settlements.map((item) => {
    if (item.type === 'batch') {
      const b = item as BatchSettlementGroup;
      const sc = statusConfig[b.status];
      return (
        <TableRow key={b.batchId} hover sx={{ backgroundColor: '#f8f7ff' }}>
          <TableCell>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Chip label="BATCH" size="small" sx={{ backgroundColor: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.65rem', width: 'fit-content' }} />
              <Typography variant="caption" sx={{ color: '#64748b' }}>{b.count} settlements</Typography>
            </Box>
          </TableCell>
          <TableCell>{b.centerName}</TableCell>
          <TableCell>
            <Typography variant="body2">{fmtDate(b.startDate)} – {fmtDate(b.endDate)}</Typography>
          </TableCell>
          <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(b.totalIncome)}</Typography></TableCell>
          <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: '#ef4444' }}>{formatCurrency(b.totalExpenses)}</Typography></TableCell>
          <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(b.netAmount)}</Typography></TableCell>
          <TableCell>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#6366f1' }}>
              {formatCurrency(Math.max(0, b.settledAmount))}
            </Typography>
          </TableCell>
          <TableCell><Chip label={sc.label} size="small" sx={{ backgroundColor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.7rem' }} /></TableCell>
          <TableCell>
            {b.remainingAmount > 0
              ? <Typography variant="body2" sx={{ fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(b.remainingAmount)}</Typography>
              : <Typography variant="body2" sx={{ color: '#94a3b8' }}>—</Typography>}
          </TableCell>
          <TableCell align="center">
            {isAdmin && (
              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                {b.status === 'PENDING' && (
                  <>
                    <Tooltip title="Approve Batch"><IconButton size="small" onClick={() => handleApproveBatch(b.batchId)} sx={{ color: '#10b981' }}><ApproveIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Reject Batch"><IconButton size="small" onClick={() => { setRejectBatchId(b.batchId); setRejectNotes(''); }} sx={{ color: '#f59e0b' }}><RejectIcon fontSize="small" /></IconButton></Tooltip>
                  </>
                )}
                <Tooltip title="Delete Batch"><IconButton size="small" onClick={() => setDeleteBatchId(b.batchId)} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
              </Box>
            )}
          </TableCell>
        </TableRow>
      );
    }
    const s = item as Settlement;
    const sc = statusConfig[s.status];
    return (
      <TableRow key={s.id} hover>
        {/* ... existing individual row JSX unchanged ... */}
```

After the closing `);` of the batch row `return (...)`, add `const s = item as Settlement;` and then keep the existing `const sc = statusConfig[s.status];` and the entire `return (<TableRow key={s.id} hover> ... </TableRow>)` block exactly as it is today — do not modify a single character of it. Only the outer `.map((s)` → `.map((item)` signature changes, and the batch branch is prepended.

- [ ] **Step 5: Replace mobile card list map with type-discriminated render**

Find the mobile `settlements.map((s) => {` section and replace with:

```tsx
settlements.map((item) => {
  if (item.type === 'batch') {
    const b = item as BatchSettlementGroup;
    const sc = statusConfig[b.status];
    return (
      <Box key={b.batchId} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Chip label="BATCH" size="small" sx={{ backgroundColor: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.65rem' }} />
            <Typography variant="caption" sx={{ color: '#64748b' }}>{b.count} settlements</Typography>
          </Box>
          <Chip label={sc.label} size="small" sx={{ backgroundColor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.68rem' }} />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>{b.centerName}</Typography>
        <Typography variant="caption" color="text.secondary">{fmtDate(b.startDate)} – {fmtDate(b.endDate)}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mt: 1.5, mb: 1 }}>
          <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Income</Typography><Typography variant="body2" sx={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(b.totalIncome)}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Expenses</Typography><Typography variant="body2" sx={{ fontWeight: 700, color: '#ef4444' }}>{formatCurrency(b.totalExpenses)}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Net</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(b.netAmount)}</Typography></Box>
          {b.remainingAmount > 0 && (
            <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Remaining</Typography><Typography variant="body2" sx={{ fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(b.remainingAmount)}</Typography></Box>
          )}
        </Box>
        {isAdmin && (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            {b.status === 'PENDING' && (
              <>
                <Tooltip title="Approve Batch"><IconButton size="small" onClick={() => handleApproveBatch(b.batchId)} sx={{ color: '#10b981' }}><ApproveIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Reject Batch"><IconButton size="small" onClick={() => { setRejectBatchId(b.batchId); setRejectNotes(''); }} sx={{ color: '#f59e0b' }}><RejectIcon fontSize="small" /></IconButton></Tooltip>
              </>
            )}
            <Tooltip title="Delete Batch"><IconButton size="small" onClick={() => setDeleteBatchId(b.batchId)} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
          </Box>
        )}
      </Box>
    );
  }
  const s = item as Settlement;
  const sc = statusConfig[s.status];
  return (
    <Box key={s.id} sx={{ p: 2 }}>
      {/* ... existing individual card JSX unchanged ... */}
```

After the closing `);` of the batch card `return (...)`, add `const s = item as Settlement;` and keep the existing `const sc = statusConfig[s.status];` and the entire `return (<Box key={s.id} sx={{ p: 2 }}> ... </Box>)` block exactly as it is today — do not modify it. Only the outer `.map((s)` → `.map((item)` signature changes.

- [ ] **Step 6: Update delete dialog to handle both individual and batch**

Replace the existing delete dialog:

```tsx
{/* Delete confirm */}
<Dialog open={!!deleteId || !!deleteBatchId} onClose={() => { setDeleteId(null); setDeleteBatchId(null); }} maxWidth="xs" fullWidth>
  <DialogTitle sx={{ fontWeight: 700 }}>Confirm Delete</DialogTitle>
  <DialogContent>
    <DialogContentText>
      {deleteBatchId
        ? 'Delete this entire batch of settlements? This cannot be undone.'
        : 'Delete this settlement? This cannot be undone.'}
    </DialogContentText>
  </DialogContent>
  <DialogActions sx={{ px: 3, pb: 3 }}>
    <Button onClick={() => { setDeleteId(null); setDeleteBatchId(null); }} variant="outlined">Cancel</Button>
    <Button
      onClick={() => { if (deleteBatchId) handleDeleteBatch(); else handleDelete(); }}
      variant="contained"
      color="error"
    >
      Delete
    </Button>
  </DialogActions>
</Dialog>
```

- [ ] **Step 7: Update reject dialog to handle both individual and batch**

Replace the existing reject dialog condition and contents:

```tsx
{(rejectId || rejectBatchId) && (
  <Box
    sx={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
    onClick={() => { setRejectId(null); setRejectBatchId(null); }}
  >
    <Card sx={{ maxWidth: 440, width: '90%' }} onClick={(e) => e.stopPropagation()}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {rejectBatchId ? 'Reject Batch' : 'Reject Settlement'}
        </Typography>
        <TextField
          fullWidth
          label="Notes (optional)"
          value={rejectNotes}
          onChange={(e) => setRejectNotes(e.target.value)}
          multiline
          rows={3}
          placeholder="Reason for rejection..."
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={() => { setRejectId(null); setRejectBatchId(null); }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => { if (rejectBatchId) handleRejectBatch(); else handleReject(); }}
          >
            Reject
          </Button>
        </Box>
      </CardContent>
    </Card>
  </Box>
)}
```

- [ ] **Step 8: Verify frontend compiles without errors**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 9: Open browser and test**

Open http://localhost:5173 and go to Settlement History. Create a batch settlement, then go to History — the batch should appear as one row with "BATCH" chip and date range. As admin, approve/reject/delete the batch.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/features/settlements/SettlementsPage.tsx
git commit -m "feat(settlements): render batch rows in history with bulk approve/reject/delete"
```
