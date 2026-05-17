# Customers Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only Customers page that lists unique customers derived from transaction data, with search/filter, spending summaries, and a per-customer transaction history drawer.

**Architecture:** Two new backend endpoints aggregate transaction data by `customerMobile` using Prisma groupBy. The frontend has a list page and a detail drawer, both calling the API directly via `apiClient` (no Redux slice needed — local state only). Route is admin-gated using the existing `AdminRoute` component.

**Tech Stack:** TypeScript, Express, Prisma (PostgreSQL), React, MUI v5, Zod, axios

---

## File Map

**Backend (create):**
- `src/modules/customers/customer.dto.ts` — Zod schemas + inferred types
- `src/modules/customers/customer.service.ts` — business logic (groupBy aggregation)
- `src/modules/customers/customer.controller.ts` — HTTP handlers
- `src/modules/customers/customer.routes.ts` — route definitions

**Backend (modify):**
- `src/app.ts` — register customer routes

**Frontend (create):**
- `src/features/customers/CustomersPage.tsx` — list page with filters + table
- `src/features/customers/CustomerDetailDrawer.tsx` — slide-out drawer with transaction history

**Frontend (modify):**
- `src/components/layout/Sidebar.tsx` — add Customers nav item (admin-only)
- `src/routes/index.tsx` — add `/customers` route (admin-gated)
- `src/utils/constants.ts` — add `CUSTOMERS` route constant

---

## Task 1: Backend DTOs

**Files:**
- Create: `backend/src/modules/customers/customer.dto.ts`

- [ ] **Step 1: Create the DTO file**

```typescript
// backend/src/modules/customers/customer.dto.ts
import { z } from 'zod';

export const customerFiltersSchema = z.object({
  search: z.string().optional(),
  centerId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['totalSpent', 'totalVisits', 'lastVisit']).default('lastVisit'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
});

export const customerDetailFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

export type CustomerFiltersDto = z.infer<typeof customerFiltersSchema>;
export type CustomerDetailFiltersDto = z.infer<typeof customerDetailFiltersSchema>;
```

- [ ] **Step 2: Commit**

```bash
cd backend
git add src/modules/customers/customer.dto.ts
git commit -m "feat(customers): add customer DTOs"
```

---

## Task 2: Backend Service

**Files:**
- Create: `backend/src/modules/customers/customer.service.ts`

- [ ] **Step 1: Create the service**

```typescript
// backend/src/modules/customers/customer.service.ts
import { prisma } from '../../config/database';
import type { CustomerFiltersDto, CustomerDetailFiltersDto } from './customer.dto';

export class CustomerService {
  async findAll(filters: CustomerFiltersDto) {
    const { search, centerId, startDate, endDate, sortBy, sortOrder, page, limit } = filters;

    const txWhere: Record<string, unknown> = {
      customerMobile: { not: null },
    };

    if (centerId) txWhere.centerId = centerId;
    if (startDate) {
      txWhere.transactionDate = {
        ...(txWhere.transactionDate as object | undefined),
        gte: new Date(startDate),
      };
    }
    if (endDate) {
      txWhere.transactionDate = {
        ...(txWhere.transactionDate as object | undefined),
        lte: new Date(endDate),
      };
    }

    // Group by mobile to get aggregates
    const grouped = await prisma.transaction.groupBy({
      by: ['customerMobile'],
      where: txWhere,
      _count: { id: true },
      _sum: { amount: true },
      _max: { transactionDate: true, customerName: true },
    });

    // Apply search filter on grouped results (mobile or name)
    let filtered = grouped;
    if (search) {
      const q = search.toLowerCase();
      filtered = grouped.filter(
        (g) =>
          g.customerMobile?.toLowerCase().includes(q) ||
          g._max.customerName?.toLowerCase().includes(q)
      );
    }

    // Collect center names per customer
    const mobiles = filtered.map((g) => g.customerMobile!);
    const centerRows = await prisma.transaction.findMany({
      where: { customerMobile: { in: mobiles } },
      select: { customerMobile: true, center: { select: { centerName: true } } },
      distinct: ['customerMobile', 'centerId'],
    });

    const centerMap = new Map<string, string[]>();
    for (const row of centerRows) {
      if (!row.customerMobile) continue;
      const existing = centerMap.get(row.customerMobile) ?? [];
      if (!existing.includes(row.center.centerName)) {
        centerMap.set(row.customerMobile, [...existing, row.center.centerName]);
      }
    }

    // Build customer list
    const customers = filtered.map((g) => ({
      customerMobile: g.customerMobile!,
      customerName: g._max.customerName ?? 'Unknown',
      totalVisits: g._count.id,
      totalSpent: Number(g._sum.amount ?? 0),
      lastVisit: g._max.transactionDate?.toISOString().slice(0, 10) ?? null,
      centers: centerMap.get(g.customerMobile!) ?? [],
    }));

    // Sort
    customers.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'totalSpent') diff = a.totalSpent - b.totalSpent;
      else if (sortBy === 'totalVisits') diff = a.totalVisits - b.totalVisits;
      else diff = (a.lastVisit ?? '').localeCompare(b.lastVisit ?? '');
      return sortOrder === 'asc' ? diff : -diff;
    });

    const total = customers.length;
    const paginated = customers.slice((page - 1) * limit, page * limit);

    return {
      data: paginated,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByMobile(mobile: string, filters: CustomerDetailFiltersDto) {
    const { page, limit } = filters;

    const transactions = await prisma.transaction.findMany({
      where: { customerMobile: mobile },
      orderBy: { transactionDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        center: { select: { centerName: true } },
        incomeSource: { select: { sourceName: true } },
        payments: true,
      },
    });

    const total = await prisma.transaction.count({ where: { customerMobile: mobile } });

    const agg = await prisma.transaction.aggregate({
      where: { customerMobile: mobile },
      _count: { id: true },
      _sum: { amount: true },
      _max: { transactionDate: true, customerName: true },
    });

    return {
      customerMobile: mobile,
      customerName: agg._max.customerName ?? 'Unknown',
      totalVisits: agg._count.id,
      totalSpent: Number(agg._sum.amount ?? 0),
      lastVisit: agg._max.transactionDate?.toISOString().slice(0, 10) ?? null,
      transactions,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/customers/customer.service.ts
git commit -m "feat(customers): add customer service with groupBy aggregation"
```

---

## Task 3: Backend Controller + Routes

**Files:**
- Create: `backend/src/modules/customers/customer.controller.ts`
- Create: `backend/src/modules/customers/customer.routes.ts`

- [ ] **Step 1: Create controller**

```typescript
// backend/src/modules/customers/customer.controller.ts
import { Response } from 'express';
import { CustomerService } from './customer.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../middleware/asyncHandler';
import { customerFiltersSchema, customerDetailFiltersSchema } from './customer.dto';
import { AuthRequest } from '../../middleware/auth';

const customerService = new CustomerService();

export class CustomerController {
  findAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = customerFiltersSchema.parse(req.query);
    const result = await customerService.findAll(filters);
    res.json(ApiResponse.success(result));
  });

  findByMobile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { mobile } = req.params;
    const filters = customerDetailFiltersSchema.parse(req.query);
    const result = await customerService.findByMobile(mobile, filters);
    res.json(ApiResponse.success(result));
  });
}
```

- [ ] **Step 2: Create routes**

```typescript
// backend/src/modules/customers/customer.routes.ts
import { Router } from 'express';
import { CustomerController } from './customer.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';

const router = Router();
const customerController = new CustomerController();

router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/', customerController.findAll);
router.get('/:mobile', customerController.findByMobile);

export default router;
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/customers/customer.controller.ts src/modules/customers/customer.routes.ts
git commit -m "feat(customers): add customer controller and routes"
```

---

## Task 4: Register Routes in app.ts

**Files:**
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Add import and register route**

In `backend/src/app.ts`, add the import after the existing imports:

```typescript
import customerRoutes from './modules/customers/customer.routes';
```

Then add the route registration after the existing `app.use` lines (e.g. after settlements):

```typescript
app.use('/api/v1/customers', customerRoutes);
```

- [ ] **Step 2: Verify server restarts cleanly**

```bash
# Watch backend logs — nodemon will restart
tail -f /tmp/backend.log
```

Expected output includes: `🚀 Server running on port 3001`

- [ ] **Step 3: Smoke-test the endpoint**

```bash
# Get a token first
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/customers?limit=5" | python3 -m json.tool
```

Expected: JSON with `data` array and `pagination` object.

- [ ] **Step 4: Commit**

```bash
git add src/app.ts
git commit -m "feat(customers): register customer routes in app"
```

---

## Task 5: Frontend — CustomerDetailDrawer

**Files:**
- Create: `frontend/src/features/customers/CustomerDetailDrawer.tsx`

- [ ] **Step 1: Create the drawer component**

```typescript
// frontend/src/features/customers/CustomerDetailDrawer.tsx
import React, { useEffect, useState } from 'react';
import {
  Drawer, Box, Typography, IconButton, Divider, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Chip, Skeleton, Avatar,
} from '@mui/material';
import { Close as CloseIcon, Phone as PhoneIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { apiClient } from '../../utils/apiClient';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

interface CustomerDetail {
  customerMobile: string;
  customerName: string;
  totalVisits: number;
  totalSpent: number;
  lastVisit: string | null;
  transactions: Array<{
    id: string;
    transactionNumber: string;
    transactionDate: string;
    amount: string | number;
    paymentMode: string;
    center: { centerName: string };
    incomeSource: { sourceName: string };
    vehicleNumber?: string;
  }>;
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

interface Props {
  mobile: string | null;
  onClose: () => void;
}

export const CustomerDetailDrawer: React.FC<Props> = ({ mobile, onClose }) => {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  useEffect(() => {
    if (!mobile) { setDetail(null); return; }
    setPage(0);
    setLoading(true);
    apiClient
      .get(`/customers/${encodeURIComponent(mobile)}`, { params: { page: 1, limit: rowsPerPage } })
      .then((res) => setDetail(res.data?.data ?? null))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [mobile]);

  const handlePageChange = (_: unknown, newPage: number) => {
    if (!mobile) return;
    setLoading(true);
    apiClient
      .get(`/customers/${encodeURIComponent(mobile)}`, { params: { page: newPage + 1, limit: rowsPerPage } })
      .then((res) => { setDetail(res.data?.data ?? null); setPage(newPage); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  return (
    <Drawer anchor="right" open={!!mobile} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 0 } }}>
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>Customer Detail</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </Box>

      {loading && !detail ? (
        <Box sx={{ p: 2.5 }}>
          <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2, mb: 2 }} />
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
        </Box>
      ) : detail ? (
        <>
          {/* Customer header */}
          <Box sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Avatar sx={{ bgcolor: '#000666', width: 44, height: 44, fontWeight: 700 }}>
                {detail.customerName?.[0]?.toUpperCase() ?? '?'}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                  {detail.customerName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PhoneIcon sx={{ fontSize: 13, color: '#64748b' }} />
                  <Typography variant="caption" sx={{ color: '#475569' }}>{detail.customerMobile}</Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`${detail.totalVisits} visits`} size="small" sx={{ bgcolor: 'rgba(0,6,102,0.08)', color: '#000666', fontWeight: 600, borderRadius: '6px' }} />
              <Chip label={fmt(detail.totalSpent)} size="small" sx={{ bgcolor: 'rgba(0,107,94,0.1)', color: '#006b5e', fontWeight: 600, borderRadius: '6px' }} />
              {detail.lastVisit && (
                <Chip label={`Last: ${format(new Date(detail.lastVisit), 'MMM d, yyyy')}`} size="small" sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 500, borderRadius: '6px' }} />
              )}
            </Box>
          </Box>

          <Divider />

          {/* Transaction history */}
          <Box sx={{ p: 2.5, pb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1.5 }}>
              Transaction History
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 700, fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' } }}>
                  <TableCell>Txn No.</TableCell>
                  <TableCell>Center</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Mode</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>
                    ))
                  : detail.transactions.map((tx) => (
                      <TableRow key={tx.id} hover>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: '#000666' }}>{tx.transactionNumber}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: '#334155' }}>{tx.center.centerName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: '#475569' }}>
                            {(() => { try { return format(new Date(tx.transactionDate), 'MMM d, yyyy'); } catch { return tx.transactionDate; } })()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#006b5e' }}>{fmt(Number(tx.amount))}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={tx.paymentMode} size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: '#f1f5f9', color: '#334155', borderRadius: '4px' }} />
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={detail.pagination.total}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[10]}
            sx={{ borderTop: '1px solid #e2e8f0' }}
          />
        </>
      ) : (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">No data found</Typography>
        </Box>
      )}
    </Drawer>
  );
};
```

- [ ] **Step 2: Commit**

```bash
cd ../frontend
git add src/features/customers/CustomerDetailDrawer.tsx
git commit -m "feat(customers): add CustomerDetailDrawer component"
```

---

## Task 6: Frontend — CustomersPage

**Files:**
- Create: `frontend/src/features/customers/CustomersPage.tsx`

- [ ] **Step 1: Create the page**

```typescript
// frontend/src/features/customers/CustomersPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, TableSortLabel, Skeleton,
  Avatar, Chip, InputAdornment,
} from '@mui/material';
import { Search as SearchIcon, PeopleAlt as PeopleIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { apiClient } from '../../utils/apiClient';
import { CustomerDetailDrawer } from './CustomerDetailDrawer';
import type { Center } from '../../types';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

interface Customer {
  customerMobile: string;
  customerName: string;
  totalVisits: number;
  totalSpent: number;
  lastVisit: string | null;
  centers: string[];
}

type SortField = 'totalSpent' | 'totalVisits' | 'lastVisit';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit] = useState(25);
  const [search, setSearch] = useState('');
  const [centerId, setCenterId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('lastVisit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedMobile, setSelectedMobile] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get('/admin/centers').then((res) => {
      const d = res.data?.data?.data || res.data?.data || [];
      setCenters(Array.isArray(d) ? d : []);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page: page + 1, limit, sortBy, sortOrder,
      };
      if (search) params.search = search;
      if (centerId) params.centerId = centerId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await apiClient.get('/customers', { params });
      const d = res.data?.data;
      setCustomers(d?.data ?? []);
      setTotal(d?.pagination?.total ?? 0);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, centerId, startDate, endDate, sortBy, sortOrder]);

  useEffect(() => { load(); }, [load]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(0);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(0,6,102,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000666' }}>
            <PeopleIcon sx={{ fontSize: 20 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>Customers</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>
          All customers derived from transaction records
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ borderRadius: '14px', mb: 2.5 }}>
        <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search name or mobile..."
              value={search}
              onChange={handleSearch}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }}
              sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.85rem' } }}
            />
            <TextField
              select size="small" value={centerId}
              onChange={(e) => { setCenterId(e.target.value); setPage(0); }}
              label="Center"
              sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.82rem' } }}
            >
              <MenuItem value="">All Centers</MenuItem>
              {centers.map((c) => <MenuItem key={c.id} value={c.id}>{c.centerName}</MenuItem>)}
            </TextField>
            <TextField
              size="small" type="date" label="From Date" value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.82rem' } }}
            />
            <TextField
              size="small" type="date" label="To Date" value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.82rem' } }}
            />
            <Typography variant="caption" sx={{ ml: 'auto', color: '#64748b', fontWeight: 500 }}>
              {total} customer{total !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Table */}
      <Card sx={{ borderRadius: '14px' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 700, fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' } }}>
                <TableCell>Customer</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>Centers</TableCell>
                <TableCell sortDirection={sortBy === 'totalVisits' ? sortOrder : false}>
                  <TableSortLabel active={sortBy === 'totalVisits'} direction={sortBy === 'totalVisits' ? sortOrder : 'desc'} onClick={() => handleSort('totalVisits')}>
                    Total Visits
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortBy === 'totalSpent' ? sortOrder : false}>
                  <TableSortLabel active={sortBy === 'totalSpent'} direction={sortBy === 'totalSpent' ? sortOrder : 'desc'} onClick={() => handleSort('totalSpent')}>
                    Total Spent
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortBy === 'lastVisit' ? sortOrder : false}>
                  <TableSortLabel active={sortBy === 'lastVisit'} direction={sortBy === 'lastVisit' ? sortOrder : 'desc'} onClick={() => handleSort('lastVisit')}>
                    Last Visit
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}><Skeleton variant="text" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : customers.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">No customers found</Typography>
                    </TableCell>
                  </TableRow>
                )
                : customers.map((c) => (
                    <TableRow
                      key={c.customerMobile}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelectedMobile(c.customerMobile)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(0,6,102,0.1)', color: '#000666', fontSize: '0.8rem', fontWeight: 700 }}>
                            {c.customerName?.[0]?.toUpperCase() ?? '?'}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>{c.customerName}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#475569', fontFamily: 'monospace' }}>{c.customerMobile}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {c.centers.map((cn) => (
                            <Chip key={cn} label={cn} size="small" sx={{ fontSize: '0.68rem', height: 20, bgcolor: '#f1f5f9', color: '#334155', borderRadius: '4px' }} />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>{c.totalVisits}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#006b5e' }}>{fmt(c.totalSpent)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#475569' }}>
                          {c.lastVisit ? (() => { try { return format(new Date(c.lastVisit), 'MMM d, yyyy'); } catch { return c.lastVisit; } })() : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={limit}
          rowsPerPageOptions={[25]}
          sx={{ borderTop: '1px solid #e2e8f0' }}
        />
      </Card>

      <CustomerDetailDrawer
        mobile={selectedMobile}
        onClose={() => setSelectedMobile(null)}
      />
    </Box>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/features/customers/CustomersPage.tsx
git commit -m "feat(customers): add CustomersPage with filters and table"
```

---

## Task 7: Wire Up Routes, Sidebar, and Constants

**Files:**
- Modify: `frontend/src/utils/constants.ts`
- Modify: `frontend/src/routes/index.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add route constant**

In `frontend/src/utils/constants.ts`, add `CUSTOMERS` to the `ROUTES` object:

```typescript
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  TRANSACTIONS_ENTRY: '/transactions/entry',
  TRANSACTIONS_LIST: '/transactions/list',
  SETTLEMENTS: '/settlements',
  ADMIN_USERS: '/admin/users',
  ADMIN_CENTERS: '/admin/centers',
  CUSTOMERS: '/customers',          // ADD THIS
} as const;
```

- [ ] **Step 2: Add route in routes/index.tsx**

Add the lazy import after the existing lazy imports:

```typescript
const CustomersPage = lazy(() =>
  import('../features/customers/CustomersPage').then((m) => ({ default: m.CustomersPage }))
);
```

Add the route inside the protected `<Route element={<ProtectedRoute />}>` block, after the Reports route:

```typescript
{/* Customers — admin only */}
<Route
  path="/customers"
  element={
    <LayoutRoute>
      <AdminRoute>
        <CustomersPage />
      </AdminRoute>
    </LayoutRoute>
  }
/>
```

- [ ] **Step 3: Add sidebar nav item**

In `frontend/src/components/layout/Sidebar.tsx`, add `PeopleAlt` to the MUI import:

```typescript
import {
  Dashboard as DashboardIcon,
  Receipt as ReceiptIcon,
  MoneyOff as MoneyOffIcon,
  AccountBalance as AccountBalanceIcon,
  EditNote as EditNoteIcon,
  BarChart as ReportsIcon,
  ManageAccounts as ManageIcon,
  EnergySavingsLeaf as EcoIcon,
  Logout as LogoutIcon,
  Assessment as AssessmentIcon,
  PeopleAlt as PeopleAltIcon,   // ADD THIS
} from '@mui/icons-material';
```

Add the Customers nav item to the `navItems` array, between Reports and Management:

```typescript
const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'Transactions', icon: <ReceiptIcon />, path: '/transactions' },
  { label: 'Expenses', icon: <MoneyOffIcon />, path: '/expenses' },
  { label: 'Settlements', icon: <AccountBalanceIcon />, path: '/settlements' },
  { label: 'Approvals', icon: <EditNoteIcon />, path: '/edit-requests' },
  { label: 'Reports', icon: <AssessmentIcon />, path: '/reports' },
  { label: 'Customers', icon: <PeopleAltIcon />, path: '/customers', adminOnly: true },  // ADD THIS
  { label: 'Management', icon: <ManageIcon />, path: '/admin/users', adminOnly: true },
];
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/constants.ts src/routes/index.tsx src/components/layout/Sidebar.tsx
git commit -m "feat(customers): wire up customers route and sidebar nav item"
```

---

## Task 8: Verify End-to-End

- [ ] **Step 1: Open the app as admin**

Navigate to `http://localhost:5173` and log in with `admin` / `admin123`.

- [ ] **Step 2: Verify sidebar shows Customers**

"Customers" should appear between Reports and Management in the sidebar.

- [ ] **Step 3: Verify list page loads**

Click Customers → table should load with customer rows, search/filter bar visible, pagination at bottom.

- [ ] **Step 4: Verify drawer works**

Click any row → right-side drawer opens with customer name, summary chips, and transaction history table.

- [ ] **Step 5: Verify staff cannot access**

Log out, log in as `staff1` / `staff123`. "Customers" should NOT appear in the sidebar. Navigating directly to `http://localhost:5173/customers` should redirect to the dashboard.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(customers): complete customers page — admin-only list with drawer"
```
