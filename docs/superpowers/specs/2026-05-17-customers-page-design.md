# Customers Page — Design Spec
**Date:** 2026-05-17  
**Status:** Approved

---

## Overview

Add a Customers page visible only to admins. Customers are not a separate DB entity — they are derived by grouping existing transactions on `customerMobile` (with `customerName` as display name). The page shows a searchable, filterable list of unique customers with spending summaries, and a detail view with full transaction history.

---

## Backend

### New module: `src/modules/customers/`

**`GET /api/v1/customers`** — Admin only. Returns paginated unique customers.

Query params:
- `search` — partial match on `customerName` or `customerMobile`
- `centerId` — filter by center
- `startDate` / `endDate` — filter transactions within date range
- `page`, `limit`, `sortBy` (`totalSpent` | `totalVisits` | `lastVisit`), `sortOrder`

Response per customer:
```json
{
  "customerMobile": "9876543210",
  "customerName": "Ravi Kumar",
  "totalVisits": 12,
  "totalSpent": 4800,
  "lastVisit": "2026-05-17",
  "centers": ["New Gumla Tradars"]
}
```

Implementation: `prisma.transaction.groupBy(['customerMobile'])` with `_count`, `_sum`, and `_max` aggregations, then join center names via a separate query.

**`GET /api/v1/customers/:mobile`** — Admin only. Returns customer profile + paginated transaction history.

Response:
```json
{
  "customerMobile": "9876543210",
  "customerName": "Ravi Kumar",
  "totalVisits": 12,
  "totalSpent": 4800,
  "lastVisit": "2026-05-17",
  "transactions": [ ...Transaction[] ]
}
```

### Auth middleware
Both routes use existing `authenticate` + `requireAdmin` middleware (same pattern as `/admin/users`).

---

## Frontend

### New files
- `src/features/customers/CustomersPage.tsx` — list view
- `src/features/customers/CustomerDetailDrawer.tsx` — slide-out detail panel

### Sidebar
Add "Customers" nav item (admin-only) between Reports and Management, using `PeopleAlt` icon from MUI, route `/customers`.

### Customers List Page (`/customers`)

**Filter bar** (same style as Dashboard):
- Search input: name or mobile
- Center dropdown (admin sees all centers)
- Date range: From / To date pickers

**Table columns:**
| Customer | Mobile | Total Visits | Total Spent | Last Visit | Action |
|----------|--------|-------------|-------------|------------|--------|

- Sortable by Total Visits, Total Spent, Last Visit
- Pagination (10/25/50 rows)
- Clicking a row opens `CustomerDetailDrawer`

### Customer Detail Drawer

Right-side drawer (width ~520px) showing:
- Header: customer name + mobile, summary chips (total visits, total spent)
- Transaction history table: Transaction No., Center, Date, Amount, Payment Mode
- Paginated (10 per page)
- Close button

---

## Access Control

- Route `/customers` is admin-only (frontend: redirect non-admins away)
- Backend endpoints return 403 for non-admin roles
- Sidebar item hidden for staff users (existing `adminOnly` flag pattern)

---

## Out of Scope

- Creating/editing/deleting customers (read-only view)
- Customer-level export (can be added later via Reports)
- Merging duplicate customers with same name but different mobiles
