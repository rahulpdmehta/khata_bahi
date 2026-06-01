# Settlement Batch History Design

**Date:** 2026-06-01  
**Status:** Approved

## Problem

Settlements created via the batch flow appear as individual unrelated rows in the Settlement History tab. There is no indication that they were created together, and no way to act on them as a group.

## Goal

When settlements were created as a batch, show them as a single collapsed row in history (e.g., "Batch: Jun 1–3, 3 settlements") with aggregated financials and bulk approve/reject/delete actions.

---

## Section 1: Data Model

Add a nullable `batchId` column to the `settlements` table.

```prisma
model Settlement {
  // ...existing fields...
  batchId  String?  @db.Char(36)

  @@index([batchId])
}
```

- `batchId` is `null` for individually-created settlements — they are unaffected.
- `createBatch` generates one `randomUUID()` per call and stamps all settlements in that transaction with it.
- Requires a Prisma migration (`prisma migrate dev`).

---

## Section 2: Backend API Changes

### a) `createBatch` service

Generate one UUID before the transaction loop:

```typescript
const batchId = randomUUID();
// pass batchId into every tx.settlement.create data object
```

### b) New batch action endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/settlements/batch/:batchId/approve` | Approve all settlements with this batchId |
| `POST` | `/api/v1/settlements/batch/:batchId/reject` | Reject all; accepts `{ notes }` body |
| `DELETE` | `/api/v1/settlements/batch/:batchId` | Delete all matching settlements |

Each endpoint is admin-only (same auth guard as existing approve/reject/delete).

### c) `findAll` service — grouping

After fetching a page of settlements, group by `batchId` before returning:

- Settlements with `batchId !== null` sharing the same `batchId` → aggregated into one `BatchSettlementGroup` object
- Settlements with `batchId === null` → returned with `type: 'individual'` added by the service layer

**`BatchSettlementGroup` shape:**

```typescript
{
  type: 'batch';
  batchId: string;
  centerId: string;
  centerName: string;
  startDate: string;       // earliest settlementDate in batch
  endDate: string;         // latest settlementDate in batch
  count: number;           // number of settlements in batch
  totalIncome: number;     // sum
  totalExpenses: number;   // sum
  netAmount: number;       // sum
  settledAmount: number;   // sum
  remainingAmount: number; // sum
  finalAmount: number;     // sum
  status: SettlementStatus; // shared status (batch actions are atomic)
  createdAt: string;
}
```

**Pagination:** Total count stays based on record count (a 3-day batch counts as 3 toward the total). Some pages may show fewer visible rows than `rowsPerPage` when batches are present — acceptable trade-off to keep server-side pagination simple.

---

## Section 3: Frontend Changes

### a) `settlementSlice.ts`

- Add `BatchSettlementGroup` TypeScript type matching the shape above
- Change `settlements` state: `Settlement[]` → `(Settlement | BatchSettlementGroup)[]`
- Add three thunks:
  - `approveBatch(batchId)` — POST to approve endpoint, refresh list on success
  - `rejectBatch({ batchId, notes })` — POST to reject endpoint, refresh list on success
  - `deleteBatch(batchId)` — DELETE endpoint, refresh list on success

### b) `SettlementsPage.tsx` — History tab

Route each row through a type discriminator:

```typescript
if (item.type === 'batch') { /* render BatchRow */ }
else { /* render existing individual row — unchanged */ }
```

**Desktop batch table row:**
- Settlement No column: "BATCH" purple chip + "N settlements" badge
- Center column: center name
- Date column: date range (e.g., "Jun 1 – Jun 3")
- Financial columns: summed values (same columns as individual rows)
- Status column: status chip
- Actions: approve / reject / delete buttons wired to batch thunks (admin only)

**Mobile batch card:**
- "BATCH" chip at top-right alongside status chip
- Date range label instead of single date
- "N settlements" sub-label
- Summed financial grid (same layout as individual card)
- Action buttons at bottom (same as desktop, admin only)

Individual rows are completely unchanged.

---

## Out of Scope

- Expanding a batch row to see individual settlements (no drill-down)
- Partial batch approval (approve some, reject others)
- Editing individual settlements within a batch
