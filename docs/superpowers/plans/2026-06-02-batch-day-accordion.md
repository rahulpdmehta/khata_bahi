# Batch Day-Wise Accordion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Expand a batch row in Settlement History to reveal each day's date + settled amount, read-only.

**Architecture:** Backend adds a `days` array to the batch group (mapped from already-loaded member records). Frontend renders a chevron toggle on the batch row that expands an inline MUI `<Collapse>` sub-row listing each day.

**Tech Stack:** Prisma/TypeScript backend, React + MUI frontend.

---

### Task 1: Backend — add `days` to batch group

**Files:** `backend/src/modules/settlements/settlement.service.ts`

- [ ] **Step 1:** Add `days` to the `BatchGroup` type (after `createdAt`):
```typescript
  days: { date: string; settledAmount: number }[];
```

- [ ] **Step 2:** In `aggregateBatchGroup`, add the `days` field to the returned object (after `createdAt`):
```typescript
      days: sorted.map((r) => ({
        date: toDateStr(new Date(r.settlementDate)),
        settledAmount: Number(r.settledAmount),
      })),
```

- [ ] **Step 3:** Verify backend compiles: `cd backend && npx tsc --noEmit` → no errors. Commit.

---

### Task 2: Frontend type

**Files:** `frontend/src/types/index.ts`

- [ ] **Step 1:** Add to `BatchSettlementGroup` (after `createdAt`):
```typescript
  days: { date: string; settledAmount: number }[];
```

---

### Task 3: Frontend UI — chevron + Collapse sub-row + mobile toggle

**Files:** `frontend/src/features/settlements/SettlementsPage.tsx`

- [ ] **Step 1:** Add `Collapse` to the `@mui/material` import list and `KeyboardArrowDown as ExpandIcon, KeyboardArrowUp as CollapseIcon` to the `@mui/icons-material` import list.

- [ ] **Step 2:** Add state near the other useState declarations:
```typescript
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
```

- [ ] **Step 3:** In the desktop batch row first `<TableCell>`, wrap the BATCH chip box with a chevron toggle. Replace the existing first cell content with a flex row: a small `IconButton` toggling `expandedBatchId`, then the existing chip+count box.

- [ ] **Step 4:** Immediately after the batch `</TableRow>` (before the closing `);` of the batch branch return), wrap both rows in a `<React.Fragment key={b.batchId}>` and add a second row:
```tsx
<TableRow>
  <TableCell colSpan={isAdmin ? 9 : 8} sx={{ py: 0, borderBottom: expandedBatchId === b.batchId ? undefined : 'none' }}>
    <Collapse in={expandedBatchId === b.batchId} timeout="auto" unmountOnExit>
      <Box sx={{ py: 1.5, px: 2 }}>
        {b.days.map((d) => (
          <Box key={d.date} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eef2f7' }}>
            <Typography variant="body2" sx={{ color: '#475569' }}>{fmtDate(d.date)}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#6366f1' }}>{formatCurrency(Math.max(0, d.settledAmount))}</Typography>
          </Box>
        ))}
      </Box>
    </Collapse>
  </TableCell>
</TableRow>
```

- [ ] **Step 5:** In the mobile batch card, add a toggle button + collapsible day list after the financial grid.

- [ ] **Step 6:** Verify frontend compiles: `cd frontend && npx tsc --noEmit` → no errors. Commit.
