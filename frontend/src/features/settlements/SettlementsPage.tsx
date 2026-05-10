import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Skeleton,
  Divider,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TableSortLabel,
  InputAdornment,
  TablePagination,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  CheckCircle as ApproveIcon,
  Add as AddIcon,
  Cancel as RejectIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  EditNote as EditNoteIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchSettlements, createSettlement, approveSettlement, rejectSettlement, deleteSettlement } from './settlementSlice';
import { fetchCenters } from '../admin/centerSlice';
import { createEditRequest } from '../editRequests/editRequestSlice';
import type { Settlement } from '../../types';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const statusConfig: Record<Settlement['status'], { label: string; bg: string; color: string }> = {
  PENDING: { label: 'Pending', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  APPROVED: { label: 'Approved', bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  REJECTED: { label: 'Rejected', bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
};

const fmtDate = (d: string) => { try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; } };

export const SettlementsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { settlements, loading, pagination } = useAppSelector((state) => state.settlements);
  const { centers } = useAppSelector((state) => state.centers);
  const isAdmin = user?.role === 'ADMIN';

  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [centerFilter, setCenterFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ field: 'settlementDate' | 'totalIncome' | 'netAmount'; order: 'asc' | 'desc' }>({
    field: 'settlementDate',
    order: 'desc',
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [editRequestSettlement, setEditRequestSettlement] = useState<Settlement | null>(null);
  const [editRequestReason, setEditRequestReason] = useState('');
  const [editRequestFields, setEditRequestFields] = useState({ carryForwardAmount: '', settlementDate: '', notes: '' });
  const [editRequestSubmitting, setEditRequestSubmitting] = useState(false);

  const handleSort = (field: 'settlementDate' | 'totalIncome' | 'netAmount') => {
    setSort((s) => ({ field, order: s.field === field && s.order === 'asc' ? 'desc' : 'asc' }));
    setPage(0);
  };
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' as 'success' | 'error' });

  const [form, setForm] = useState({
    centerId: user?.centers?.[0]?.id || '',
    settlementDate: format(new Date(), 'yyyy-MM-dd'),
    carryForwardAmount: '0',
    notes: '',
  });

  const [preview, setPreview] = useState<{
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAdmin) dispatch(fetchCenters());
  }, [dispatch, isAdmin]);

  useEffect(() => {
    const params: Record<string, unknown> = {
      page: page + 1,
      limit: rowsPerPage,
      sortBy: sort.field,
      sortOrder: sort.order,
    };
    if (statusFilter) params.status = statusFilter;
    if (centerFilter) params.centerId = centerFilter;
    if (dateFrom) params.startDate = dateFrom;
    if (dateTo) params.endDate = dateTo;
    if (search) params.search = search;
    dispatch(fetchSettlements(params));
  }, [dispatch, page, rowsPerPage, statusFilter, centerFilter, dateFrom, dateTo, search, sort]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleCalculate = async () => {
    if (!form.centerId || !form.settlementDate) return;
    try {
      const { apiClient } = await import('../../utils/apiClient');
      const [previewRes, prevSettlementRes] = await Promise.allSettled([
        apiClient.get('/settlements/preview', {
          params: { centerId: form.centerId, settlementDate: form.settlementDate },
        }),
        apiClient.get('/settlements', {
          params: { centerId: form.centerId, status: 'APPROVED', sortBy: 'settlementDate', sortOrder: 'desc', limit: 1, page: 1 },
        }),
      ]);

      if (previewRes.status === 'rejected') throw new Error('Preview failed');
      const d = previewRes.value.data?.data || previewRes.value.data;
      setPreview({
        totalIncome: d.totalIncome ?? 0,
        totalExpenses: d.totalExpenses ?? 0,
        netAmount: d.netAmount ?? 0,
      });

      // Auto-fill carry forward from last approved settlement's finalAmount
      if (prevSettlementRes.status === 'fulfilled') {
        const payload = prevSettlementRes.value.data?.data;
        const list = Array.isArray(payload) ? payload : (payload?.data ?? []);
        if (list.length > 0) {
          const lastFinalAmount = Number(list[0].finalAmount ?? 0);
          setForm((f) => ({ ...f, carryForwardAmount: String(lastFinalAmount) }));
        } else {
          setForm((f) => ({ ...f, carryForwardAmount: '0' }));
        }
      }
    } catch {
      setSnack({ open: true, msg: 'Failed to calculate settlement', severity: 'error' });
    }
  };

  const handleSubmitSettlement = async () => {
    if (!form.centerId || !preview) return;
    setSubmitting(true);
    try {
      await dispatch(
        createSettlement({
          ...form,
          carryForwardAmount: parseFloat(form.carryForwardAmount),
          totalIncome: preview.totalIncome,
          totalExpenses: preview.totalExpenses,
          netAmount: preview.netAmount,
          finalAmount: preview.netAmount + parseFloat(form.carryForwardAmount || '0'),
        })
      ).unwrap();
      setSnack({ open: true, msg: 'Settlement submitted successfully!', severity: 'success' });
      setPreview(null);
      setForm({
        centerId: user?.centers?.[0]?.id || '',
        settlementDate: format(new Date(), 'yyyy-MM-dd'),
        carryForwardAmount: '0',
        notes: '',
      });
    } catch (err: unknown) {
      setSnack({ open: true, msg: typeof err === 'string' ? err : 'Failed to submit settlement', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await dispatch(approveSettlement(id)).unwrap();
      setSnack({ open: true, msg: 'Settlement approved!', severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Failed to approve', severity: 'error' });
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    try {
      await dispatch(rejectSettlement({ id: rejectId, notes: rejectNotes })).unwrap();
      setSnack({ open: true, msg: 'Settlement rejected.', severity: 'success' });
      setRejectId(null);
      setRejectNotes('');
    } catch {
      setSnack({ open: true, msg: 'Failed to reject.', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await dispatch(deleteSettlement(deleteId)).unwrap();
      setSnack({ open: true, msg: 'Settlement deleted.', severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Failed to delete.', severity: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
          Settlements
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Daily settlement management
        </Typography>
      </Box>

      <Card>
        <Box sx={{ borderBottom: '1px solid #e2e8f0' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ px: 3, '& .MuiTab-root': { minWidth: 140 } }}
          >
            <Tab label="Create Settlement" icon={<AddIcon />} iconPosition="start" />
            <Tab label="Settlement History" icon={<AccountBalanceIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Create Settlement Tab */}
        {tab === 0 && (
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Center *"
                  name="centerId"
                  value={form.centerId}
                  onChange={handleFormChange}
                >
                  {(isAdmin ? centers : (user?.centers || [])).map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.centerName} ({c.centerCode})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Settlement Date *"
                  name="settlementDate"
                  type="date"
                  value={form.settlementDate}
                  onChange={handleFormChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  onClick={handleCalculate}
                  disabled={!form.centerId}
                  startIcon={<AccountBalanceIcon />}
                >
                  Calculate Settlement
                </Button>
              </Grid>

              {preview && (
                <>
                  <Grid item xs={12}>
                    <Paper
                      variant="outlined"
                      sx={{ p: 3, borderRadius: '12px', backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                        Settlement Summary
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Total Income</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                              {formatCurrency(preview.totalIncome)}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Total Expenses</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#ef4444' }}>
                              {formatCurrency(preview.totalExpenses)}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Net Amount</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#6366f1' }}>
                              {formatCurrency(preview.netAmount)}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Carry Forward</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                              {formatCurrency(parseFloat(form.carryForwardAmount) || 0)}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <Box sx={{ textAlign: 'center', borderLeft: { sm: '1px solid #e2e8f0' }, pl: { sm: 2 } }}>
                            <Typography variant="caption" color="text.secondary">Final Amount</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: '#000666' }}>
                              {formatCurrency(preview.netAmount + (parseFloat(form.carryForwardAmount) || 0))}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem' }}>
                              Net + Carry Forward
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Carry Forward Amount"
                      name="carryForwardAmount"
                      type="number"
                      value={form.carryForwardAmount}
                      onChange={handleFormChange}
                      helperText="Auto-filled from last approved settlement — edit if needed"
                      inputProps={{ min: 0 }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Notes (optional)"
                      name="notes"
                      value={form.notes}
                      onChange={handleFormChange}
                      multiline
                      rows={2}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                      <Button variant="outlined" onClick={() => setPreview(null)}>
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleSubmitSettlement}
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
                        sx={{ minWidth: 160 }}
                      >
                        {submitting ? 'Submitting...' : 'Submit Settlement'}
                      </Button>
                    </Box>
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        )}

        {/* History Tab */}
        {tab === 1 && (
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: isAdmin ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)' }, gap: 1.5, mb: 2 }}>
              <TextField size="small" placeholder="Search settlement no" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }} />
              <TextField size="small" label="From Date" type="date" value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
              <TextField size="small" label="To Date" type="date" value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
              {isAdmin && (
                <TextField select size="small" label="Center" value={centerFilter}
                  onChange={(e) => { setCenterFilter(e.target.value); setPage(0); }}>
                  <MenuItem value="">All Centers</MenuItem>
                  {centers.map((c) => <MenuItem key={c.id} value={c.id}>{c.centerName}</MenuItem>)}
                </TextField>
              )}
              <TextField select size="small" label="Status" value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="APPROVED">Approved</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
              </TextField>
            </Box>
            {/* Mobile card list */}
            {isMobile ? (
              <>
                {loading ? (
                  <Stack divider={<Divider />}>
                    {Array.from({ length: 4 }).map((_, i) => <Box key={i} sx={{ p: 2 }}><Skeleton variant="text" width="60%" /><Skeleton variant="text" width="80%" /></Box>)}
                  </Stack>
                ) : settlements.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}><Typography color="text.secondary">No settlements found</Typography></Box>
                ) : (
                  <Stack divider={<Divider />}>
                    {settlements.map((s) => {
                      const sc = statusConfig[s.status];
                      return (
                        <Box key={s.id} sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#6366f1', fontSize: '0.78rem' }}>{s.settlementNumber}</Typography>
                            <Chip label={sc.label} size="small" sx={{ backgroundColor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.68rem' }} />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>{s.center?.centerName || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">{fmtDate(s.settlementDate)}</Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mt: 1.5, mb: 1 }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Income</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(Number(s.totalIncome))}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Expenses</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#ef4444' }}>{formatCurrency(Number(s.totalExpenses))}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Net</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(Number(s.netAmount))}</Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            {isAdmin ? (
                              <>
                                {s.status === 'PENDING' && (
                                  <>
                                    <Tooltip title="Approve"><IconButton size="small" onClick={() => handleApprove(s.id)} sx={{ color: '#10b981' }}><ApproveIcon fontSize="small" /></IconButton></Tooltip>
                                    <Tooltip title="Reject"><IconButton size="small" onClick={() => { setRejectId(s.id); setRejectNotes(''); }} sx={{ color: '#f59e0b' }}><RejectIcon fontSize="small" /></IconButton></Tooltip>
                                  </>
                                )}
                                <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteId(s.id)} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                              </>
                            ) : (
                              <Tooltip title="Request Edit"><IconButton size="small" onClick={() => { setEditRequestSettlement(s); setEditRequestReason(''); setEditRequestFields({ carryForwardAmount: String(s.carryForwardAmount ?? 0), settlementDate: s.settlementDate ? s.settlementDate.slice(0, 10) : '', notes: s.notes || '' }); }} sx={{ color: '#f59e0b' }}><EditNoteIcon fontSize="small" /></IconButton></Tooltip>
                            )}
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
                <TablePagination component="div" count={pagination?.total ?? settlements.length} page={page}
                  onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                  rowsPerPageOptions={[5, 10, 25]} labelRowsPerPage="" />
              </>
            ) : (
              /* Desktop table */
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Settlement No</TableCell>
                        <TableCell>Center</TableCell>
                        <TableCell sortDirection={sort.field === 'settlementDate' ? sort.order : false}>
                          <TableSortLabel active={sort.field === 'settlementDate'} direction={sort.field === 'settlementDate' ? sort.order : 'desc'} onClick={() => handleSort('settlementDate')}>Date</TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={sort.field === 'totalIncome' ? sort.order : false}>
                          <TableSortLabel active={sort.field === 'totalIncome'} direction={sort.field === 'totalIncome' ? sort.order : 'desc'} onClick={() => handleSort('totalIncome')}>Total Income</TableSortLabel>
                        </TableCell>
                        <TableCell>Total Expenses</TableCell>
                        <TableCell sortDirection={sort.field === 'netAmount' ? sort.order : false}>
                          <TableSortLabel active={sort.field === 'netAmount'} direction={sort.field === 'netAmount' ? sort.order : 'desc'} onClick={() => handleSort('netAmount')}>Net Amount</TableSortLabel>
                        </TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>{Array.from({ length: isAdmin ? 8 : 7 }).map((__, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>
                          ))
                        : settlements.length === 0
                        ? (
                          <TableRow><TableCell colSpan={isAdmin ? 8 : 7} align="center" sx={{ py: 5 }}><Typography color="text.secondary">No settlements found</Typography></TableCell></TableRow>
                        )
                        : settlements.map((s) => {
                            const sc = statusConfig[s.status];
                            return (
                              <TableRow key={s.id} hover>
                                <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: '#6366f1' }}>{s.settlementNumber}</Typography></TableCell>
                                <TableCell>{s.center?.centerName || '—'}</TableCell>
                                <TableCell>
                                  <Typography variant="body2">{fmtDate(s.settlementDate)}</Typography>
                                  {s.createdAt && <Typography variant="caption" sx={{ color: '#64748b' }}>{(() => { try { return format(new Date(s.createdAt), 'hh:mm a'); } catch { return ''; } })()}</Typography>}
                                </TableCell>
                                <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(Number(s.totalIncome))}</Typography></TableCell>
                                <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: '#ef4444' }}>{formatCurrency(Number(s.totalExpenses))}</Typography></TableCell>
                                <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(Number(s.netAmount))}</Typography></TableCell>
                                <TableCell><Chip label={sc.label} size="small" sx={{ backgroundColor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.7rem' }} /></TableCell>
                                <TableCell align="center">
                                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                    {isAdmin ? (
                                      <>
                                        {s.status === 'PENDING' && (
                                          <>
                                            <Tooltip title="Approve"><IconButton size="small" onClick={() => handleApprove(s.id)} sx={{ color: '#10b981' }}><ApproveIcon fontSize="small" /></IconButton></Tooltip>
                                            <Tooltip title="Reject"><IconButton size="small" onClick={() => { setRejectId(s.id); setRejectNotes(''); }} sx={{ color: '#f59e0b' }}><RejectIcon fontSize="small" /></IconButton></Tooltip>
                                          </>
                                        )}
                                        <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteId(s.id)} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                                      </>
                                    ) : (
                                      <Tooltip title="Request Edit"><IconButton size="small" onClick={() => { setEditRequestSettlement(s); setEditRequestReason(''); setEditRequestFields({ carryForwardAmount: String(s.carryForwardAmount ?? 0), settlementDate: s.settlementDate ? s.settlementDate.slice(0, 10) : '', notes: s.notes || '' }); }} sx={{ color: '#f59e0b' }}><EditNoteIcon fontSize="small" /></IconButton></Tooltip>
                                    )}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination component="div" count={pagination?.total ?? settlements.length} page={page}
                  onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                  rowsPerPageOptions={[5, 10, 25, 50]} />
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* Settlement edit request dialog */}
      <Dialog open={!!editRequestSettlement} onClose={() => setEditRequestSettlement(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Request Edit — {editRequestSettlement?.settlementNumber}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Update the fields you want changed. Only modified fields will be sent for approval.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Settlement Date"
                type="date"
                value={editRequestFields.settlementDate}
                onChange={(e) => setEditRequestFields((f) => ({ ...f, settlementDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Carry Forward Amount"
                type="number"
                value={editRequestFields.carryForwardAmount}
                onChange={(e) => setEditRequestFields((f) => ({ ...f, carryForwardAmount: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={editRequestFields.notes}
                onChange={(e) => setEditRequestFields((f) => ({ ...f, notes: e.target.value }))}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Reason for change *"
                value={editRequestReason}
                onChange={(e) => setEditRequestReason(e.target.value)}
                multiline
                rows={2}
                placeholder="Explain why these changes are needed..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setEditRequestSettlement(null)} variant="outlined">Cancel</Button>
          <Button
            variant="contained"
            disabled={!editRequestReason || editRequestSubmitting}
            sx={{ color: '#fff', '&.Mui-disabled': { color: 'rgba(255,255,255,0.5)' } }}
            onClick={async () => {
              if (!editRequestSettlement || !editRequestReason) return;
              setEditRequestSubmitting(true);
              try {
                const proposedChanges: Record<string, unknown> = {};
                const origDate = editRequestSettlement.settlementDate?.slice(0, 10) || '';
                if (editRequestFields.settlementDate !== origDate)
                  proposedChanges.settlementDate = editRequestFields.settlementDate;
                if (Number(editRequestFields.carryForwardAmount) !== Number(editRequestSettlement.carryForwardAmount ?? 0))
                  proposedChanges.carryForwardAmount = Number(editRequestFields.carryForwardAmount);
                if (editRequestFields.notes !== (editRequestSettlement.notes || ''))
                  proposedChanges.notes = editRequestFields.notes;
                await dispatch(createEditRequest({
                  settlementId: editRequestSettlement.id,
                  resourceType: 'SETTLEMENT',
                  requestReason: editRequestReason,
                  proposedChanges,
                })).unwrap();
                setSnack({ open: true, msg: 'Edit request submitted successfully.', severity: 'success' });
                setEditRequestSettlement(null);
                setEditRequestReason('');
              } catch (err: unknown) {
                setSnack({ open: true, msg: typeof err === 'string' ? err : 'Failed to submit request', severity: 'error' });
              } finally {
                setEditRequestSubmitting(false);
              }
            }}
          >
            {editRequestSubmitting ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>Delete this settlement? This cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteId(null)} variant="outlined">Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Reject dialog */}
      {rejectId && (
        <Box
          sx={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setRejectId(null)}
        >
          <Card sx={{ maxWidth: 440, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Reject Settlement</Typography>
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
                <Button variant="outlined" onClick={() => setRejectId(null)}>Cancel</Button>
                <Button variant="contained" color="error" onClick={handleReject}>Reject</Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};
