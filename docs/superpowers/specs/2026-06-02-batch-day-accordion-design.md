# Batch Day-Wise Accordion Design

**Date:** 2026-06-02
**Status:** Approved

## Goal

Let users expand a batch row in Settlement History to see each constituent day's date and settled amount, in an inline read-only accordion. No per-day actions.

---

## Section 1: Backend

`aggregateBatchGroup` already receives all member settlement records. Add a `days` array to the returned `BatchGroup`:

```typescript
days: { date: string; settledAmount: number }[];
```

Built by mapping the already-sorted (ascending by date) member records:
```typescript
days: sorted.map((r) => ({
  date: toDateStr(new Date(r.settlementDate)),
  settledAmount: Number(r.settledAmount),
})),
```

No new queries — the records are already loaded. `BatchGroup` type gains the `days` field.

**File:** `backend/src/modules/settlements/settlement.service.ts`

---

## Section 2: Frontend Types

Add to `BatchSettlementGroup` in `frontend/src/types/index.ts`:

```typescript
days: { date: string; settledAmount: number }[];
```

---

## Section 3: Frontend UI

### Desktop table

- New component-level state: `const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);`
- The batch row's first cell gets a small chevron `IconButton` (KeyboardArrowDown / KeyboardArrowUp icon depending on expanded state) next to the "BATCH" chip. Clicking toggles `expandedBatchId` between `b.batchId` and `null`.
- Immediately after the batch `<TableRow>`, render a second `<TableRow>` whose single `<TableCell colSpan={isAdmin ? 9 : 8}>` wraps an MUI `<Collapse in={expandedBatchId === b.batchId} timeout="auto" unmountOnExit>`.
- Inside the Collapse: a compact list, one line per day:
  - Left: formatted date (`fmtDate(d.date)`)
  - Right: settled amount (`formatCurrency(Math.max(0, d.settledAmount))`)
- The cell has `paddingY: 0` so the collapsed state adds no vertical space.

### Mobile card

- The batch card gets a text toggle button "Show days ▾" / "Hide days ▴" that flips the same `expandedBatchId` state.
- When expanded, render the same date + settled-amount list below the financial grid.

### Read-only

No action buttons inside the accordion. Individual settlements within a batch are not separately actionable here.

---

## Out of Scope

- Per-day approve/reject/delete
- Showing other per-day fields (net, carry-forward, remaining, settlement number)
- Editing days
