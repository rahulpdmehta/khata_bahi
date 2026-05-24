# Partial Settlement Design

**Date:** 2026-05-24
**Status:** Approved

## Problem

Staff can only submit a full settlement — the entire `finalAmount` for the day. In practice, a staff member may only have part of the cash available and needs to hand over a partial amount now, with the rest settled later.

## Goal

Allow staff to specify how much of the `finalAmount` they are actually handing over when creating a settlement. The unpaid remainder automatically carries forward into the next settlement's carry-forward amount.

## Data Model Changes

Add two columns to the `settlements` table:

| Column | Type | Default | Description |
|---|---|---|---|
| `settledAmount` | `Decimal(10,2)` | `0` | Amount actually handed over at time of settlement |
| `remainingAmount` | `Decimal(10,2)` | `0` | `finalAmount − settledAmount`; unpaid balance |

Both default to `0`. Existing records are treated as fully settled (remaining = 0).

**Invariant:** `settledAmount + remainingAmount = finalAmount`

## Backend Changes

### `settlement.dto.ts`
- Add optional `settledAmount: number` to `CreateSettlementDto`. If omitted, defaults to `finalAmount` (full settlement, backward compatible).

### `settlement.service.ts` — `create`
```
settledAmount = dto.settledAmount ?? finalAmount
remainingAmount = finalAmount - settledAmount
```
Both values are persisted to the DB.

### `settlement.service.ts` — carry-forward auto-fill
The `preview` endpoint stays unchanged (it only computes income/expenses for the day). The auto-fill of `carryForwardAmount` happens on the frontend by reading the last approved settlement.

**Changed logic:** use `remainingAmount` from the last approved settlement as the suggested carry-forward (instead of `finalAmount`). If `remainingAmount = 0` (fully settled or old record), carry-forward suggestion is `0`.

## Frontend Changes

### Create Settlement form
- After the preview is calculated, a **Settled Amount** field appears alongside Carry Forward.
  - Default value: `finalAmount` (full settlement)
  - Constraint: `0 ≤ settledAmount ≤ finalAmount`
  - `type="number"`, `min=0`, `max=finalAmount`, `step=1`
- The summary card shows five values: Total Income, Total Expenses, Net Amount, Carry Forward, Final Amount (existing) + two new cells:
  - **Settled Now** — live-computed from the input
  - **Remaining** — `finalAmount − settledAmount`, shown in amber when > 0
- On submit, `settledAmount` is sent in the payload.

### Settlement History table
- Add a **Remaining** column showing `remainingAmount`. Cells with `remainingAmount > 0` are styled in amber to draw attention.
- Mobile card view also shows remaining when > 0.

### Carry-forward auto-fill (frontend)
- After fetching the last approved settlement, use `remainingAmount` (not `finalAmount`) as the suggested `carryForwardAmount`.
- Backward compat: old records have `remainingAmount = 0`, so their auto-fill contribution is `0`.

## Migration

A Prisma migration adds `settledAmount` and `remainingAmount` with `@default(0)`. No data backfill needed — zero defaults correctly represent "fully settled" for all existing records.

## Out of Scope

- No new settlement status (e.g. PARTIAL) — partial settlements use the same PENDING/APPROVED/REJECTED flow.
- No enforcement that remaining must be paid before a new settlement can be created — the carry-forward mechanism handles this naturally.
