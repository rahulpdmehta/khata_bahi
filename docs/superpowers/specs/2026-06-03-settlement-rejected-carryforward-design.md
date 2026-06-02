# Settlement Rejected-Status Carry-Forward & Sequencing Design

**Date:** 2026-06-03
**Status:** Approved

## Problem

Settlement creation anchors on the *most recent settlement by date, regardless of status*. Consequences:
1. A **REJECTED** settlement still contributes its `remainingAmount` as carry-forward to the next day (wrong — a rejected settlement is void).
2. A rejected day's date stays "settled" (blocked by `@@unique([centerId, settlementDate])`), with no clean way to re-settle it.
3. Nothing prevents creating the next settlement while the previous one is still PENDING.

## Decisions (locked)

1. **Delete & recreate** the rejected record when re-settling a rejected day.
2. **Carry-forward = last APPROVED settlement's `remainingAmount`** (0 if none). Rejected/pending settlements never contribute carry-forward.
3. **Block until APPROVED**: cannot create the next day while the latest settlement is PENDING or REJECTED. Rejected days must be re-settled (and approved) before moving forward.

---

## Section 1: Core model — anchor on last APPROVED

For a center, define:
- `lastApproved` = most recent settlement with `status = 'APPROVED'` (by `settlementDate`), or `null`.
- `baselineCarryForward` = `lastApproved ? Number(lastApproved.remainingAmount) : 0`.
- "Open window" = settlements with `settlementDate > lastApproved.settlementDate` (or all settlements if no approved one).

Behaviour driven by the open window:
- Any **PENDING** in the open window → creation **blocked** with a clear message.
- All **REJECTED** in the open window → those dates are re-settleable (deleted & recreated on create).
- Empty open window → normal forward creation from `lastApproved.date + 1`.

**Window start date** (the first settleable/re-settleable date) is defined precisely as:
- `lastApproved` exists → `lastApproved.settlementDate + 1 day`.
- else if any settlement records exist for the center (all non-approved, i.e. rejected/pending) → the **earliest** `settlementDate` among them.
- else (no records at all) → `null` (first-ever settlement; the requested date is accepted for single create, and batch defaults to just `endDate`).

---

## Section 2: `create()` (single day)

File: `backend/src/modules/settlements/settlement.service.ts`

Replace the current `lastSettlement`/sequencing block with:

1. `lastApproved` = `prisma.settlement.findFirst({ where: { centerId, status: 'APPROVED' }, orderBy: { settlementDate: 'desc' } })`.
   `carryForwardAmount = lastApproved ? Number(lastApproved.remainingAmount) : 0`.
2. **Pending block:** find a PENDING settlement after `lastApproved`:
   ```
   const pending = await prisma.settlement.findFirst({
     where: { centerId, status: 'PENDING',
       ...(lastApproved ? { settlementDate: { gt: lastApproved.settlementDate } } : {}) },
     orderBy: { settlementDate: 'asc' },
   });
   if (pending) throw ApiError.badRequest(
     `Settlement for ${dateStr(pending.settlementDate)} is pending approval. Approve or reject it before creating a new one.`);
   ```
3. **Expected date:** compute `windowStartDate` per Section 1 (lastApproved+1, else earliest existing record's date, else null).
   - If `windowStartDate` is `null` (no records at all) → allow the requested date (first-ever settlement); skip the comparison.
   - Else compare `windowStartDate` to requested `settlementDate` (both at local midnight):
     - `requested < windowStartDate` → `ApiError.badRequest('Cannot settle a date on or before an already-approved settlement.')`
     - `requested > windowStartDate` → `ApiError.badRequest('Settle earlier pending days first — use batch creation.')`
4. **Existing-record handling at requested date:** look up the existing settlement on that date.
   - REJECTED → mark for deletion.
   - PENDING/APPROVED → `ApiError.conflict('A settlement already exists for this center on this date')`.
5. Wrap delete (if any) + create in a single `prisma.$transaction` so a failure never loses the row:
   ```
   const settlement = await prisma.$transaction(async (tx) => {
     if (rejectedToReplaceId) await tx.settlement.delete({ where: { id: rejectedToReplaceId } });
     return tx.settlement.create({ data: { ...computed..., status: 'PENDING' }, include: settlementInclude });
   });
   ```
   Financials (`totalIncome/totalExpenses/netAmount`) come from `aggregateDayFinancials`; `finalAmount = netAmount + carryForwardAmount`; `settledAmount`/`remainingAmount` as today.

Note: the standalone `existing` conflict check at the top of `create()` is folded into step 4 (it must allow REJECTED).

---

## Section 3: `batchPreview()` + `createBatch()`

File: `backend/src/modules/settlements/settlement.service.ts`

### `batchPreview(centerId, endDate)`
- Replace `lastSettlement` with `lastApproved` (status APPROVED).
- `startDateObj` = `windowStartDate ?? endDateObj` (per Section 1: lastApproved+1, else earliest existing record's date, else default to just `endDate`).
- `initialCarryForward` = `lastApproved ? Number(lastApproved.remainingAmount) : 0`.
- **Pending block:** before building days, find a PENDING settlement after `lastApproved`; if found, `throw ApiError.badRequest(...)` with the same message as `create()` step 2.
- REJECTED records inside `[startDate, endDate]` do **not** block — they appear as re-settleable days. The per-day financial recompute and within-batch carry-forward logic are unchanged (first day gets `initialCarryForward`, each settled day passes 0 forward).

### `createBatch(...)`
- Recompute days via the updated `batchPreview` (already does).
- Inside the existing `prisma.$transaction(..., { timeout: 30000 })`, **before creating** the new rows, delete any REJECTED settlements in range:
  ```
  await tx.settlement.deleteMany({
    where: { centerId: dto.centerId, status: 'REJECTED',
      settlementDate: { gte: new Date(days[0].date), lte: new Date(days[days.length-1].date) } },
  });
  ```
- Keep the existing `P2002` catch as a safety net (would only fire if a PENDING/APPROVED day were in range, which the block check prevents).

---

## Section 4: Frontend (Create tab)

File: `frontend/src/features/settlements/SettlementsPage.tsx`

- When `fetchBatchPreview` is **rejected** (e.g., the pending-approval block), display the returned error message in the Create-tab preview area (it currently shows a blank/empty state). The thunk already returns the backend message via `rejectWithValue`; surface `state.settlements.error` (or a local message) in the preview region.
- Re-settling rejected days needs no special UI: the preview shows those days again with correct carry-forward, and submit uses the normal single/batch path (now delete-and-recreate).

---

## Out of Scope

- Back-fixing carry-forward on settlements already created with a rejected predecessor (one-off data correction, done separately if requested).
- Changing the `@@unique([centerId, settlementDate])` constraint (kept).
- Audit-logging deleted rejected settlements.
