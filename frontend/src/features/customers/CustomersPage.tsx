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
