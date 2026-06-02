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
  Collapse,
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
  LockOutlined as LockIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
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
import { fetchCenters } from '../admin/centerSlice';
import { createEditRequest } from '../editRequests/editRequestSlice';
import type { Settlement, BatchSettlementGroup } from '../../types';

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
  const { settlements, loading, pagination, batchPreviewDays, batchPreviewLoading } = useAppSelector((state) => state.settlements);
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
  const [deleteBatchId, setDeleteBatchId] = useState<string | null>(null);
  const [rejectBatchId, setRejectBatchId] = useState<string | null>(null);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [editRequestSettlement, setEditRequestSettlement] = useState<Settlement | null>(null);
  const [editRequestReason, setEditRequestReason] = useState('');
  const [editRequestFields, setEditRequestFields] = useState({ settlementDate: '', notes: '' });
  const [editRequestSubmitting, setEditRequestSubmitting] = useState(false);

  const handleSort = (field: 'settlementDate' | 'totalIncome' | 'netAmount') => {
    setSort((s) => ({ field, order: s.field === field && s.order === 'asc' ? 'desc' : 'asc' }));
    setPage(0);
  };
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' as 'success' | 'error' });

  // Create tab state
  const [createForm, setCreateForm] = useState({
    centerId: user?.centers?.[0]?.id || '',
    endDate: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  const [lastSettledDate, setLastSettledDate] = useState<string | null>(null);
  const [singleSettledAmount, setSingleSettledAmount] = useState('');
  const [batchSettledAmount, setBatchSettledAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAdmin) dispatch(fetchCenters());
  }, [dispatch, isAdmin]);

  useEffect(() => {
    if (!createForm.centerId) {
      setLastSettledDate(null);
      return;
    }
    import('../../utils/apiClient').then(({ apiClient }) => {
      apiClient
        .get('/settlements', {
          params: {
            centerId: createForm.centerId,
            sortBy: 'settlementDate',
            sortOrder: 'desc',
            limit: 1,
            page: 1,
          },
        })
        .then((res) => {
          const payload = res.data?.data;
          const list = Array.isArray(payload) ? payload : (payload?.data ?? []);
          setLastSettledDate(list.length > 0 ? list[0].settlementDate.slice(0, 10) : null);
        })
        .catch(() => setLastSettledDate(null));
    });
  }, [createForm.centerId]);

  useEffect(() => {
    if (!createForm.centerId || !createForm.endDate) {
      dispatch(clearBatchPreview());
      setSingleSettledAmount('');
      setBatchSettledAmount('');
      return;
    }
    dispatch(clearBatchPreview());
    setSingleSettledAmount('');
    setBatchSettledAmount('');
    dispatch(fetchBatchPreview({ centerId: createForm.centerId, endDate: createForm.endDate }));
  }, [createForm.centerId, createForm.endDate, dispatch]);

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

  const handleSingleDaySubmit = async () => {
    if (!batchPreviewDays || batchPreviewDays.length !== 1) return;
    const day = batchPreviewDays[0];
    setSubmitting(true);
    try {
      const parsedSettled = parseFloat(singleSettledAmount);
      const settledAmt = singleSettledAmount !== '' && !isNaN(parsedSettled) ? parsedSettled : undefined;
      await dispatch(
        createSettlement({
          centerId: createForm.centerId,
          settlementDate: day.date,
          notes: createForm.notes || undefined,
          ...(settledAmt !== undefined && { settledAmount: settledAmt }),
        })
      ).unwrap();
      setSnack({ open: true, msg: 'Settlement submitted successfully!', severity: 'success' });
      dispatch(clearBatchPreview());
      setSingleSettledAmount('');
      setCreateForm((f) => ({ ...f, notes: '' }));
      setLastSettledDate(day.date);
    } catch (err: unknown) {
      setSnack({
        open: true,
        msg: typeof err === 'string' ? err : 'Failed to submit settlement',
        severity: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchSubmit = async () => {
    if (!batchPreviewDays || batchPreviewDays.length <= 1) return;
    setSubmitting(true);
    try {
      const parsedBatchSettled = parseFloat(batchSettledAmount);
      const settledAmt =
        batchSettledAmount !== '' && !isNaN(parsedBatchSettled) ? parsedBatchSettled : undefined;
      const result = await dispatch(
        createBatchSettlements({
          centerId: createForm.centerId,
          endDate: createForm.endDate,
          notes: createForm.notes || undefined,
          ...(settledAmt !== undefined && { settledAmount: settledAmt }),
        })
      ).unwrap();
      const count = result.length;
      const lastDate = batchPreviewDays[batchPreviewDays.length - 1].date;
      setSnack({ open: true, msg: `${count} settlement(s) submitted successfully!`, severity: 'success' });
      dispatch(clearBatchPreview());
      setSingleSettledAmount('');
      setBatchSettledAmount('');
      setCreateForm((f) => ({ ...f, notes: '' }));
      setLastSettledDate(lastDate);
    } catch (err: unknown) {
      setSnack({
        open: true,
        msg: typeof err === 'string' ? err : 'Failed to submit settlements',
        severity: 'error',
      });
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
              {/* Center selector */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Center *"
                  value={createForm.centerId}
                  onChange={(e) => {
                    setCreateForm((f) => ({ ...f, centerId: e.target.value }));
                  }}
                >
                  {(isAdmin ? centers : (user?.centers || [])).map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.centerName} ({c.centerCode})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* End date selector */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Settle Up To *"
                  type="date"
                  value={createForm.endDate}
                  onChange={(e) => {
                    setCreateForm((f) => ({ ...f, endDate: e.target.value }));
                  }}
                  InputLabelProps={{ shrink: true }}
                  helperText={
                    lastSettledDate
                      ? `Last settled: ${fmtDate(lastSettledDate)}`
                      : 'No settlements yet for this center'
                  }
                />
              </Grid>

              {/* Loading indicator */}
              {batchPreviewLoading && batchPreviewDays === null && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                </Grid>
              )}

              {/* Results area */}
              {batchPreviewDays !== null && (
                <>
                  {batchPreviewDays.length === 0 ? (
                    <Grid item xs={12}>
                      {/* Check if endDate is before or equal to the last settled date */}
                      {lastSettledDate && createForm.endDate <= lastSettledDate ? (
                        <Alert severity="warning">
                          The selected date ({fmtDate(createForm.endDate)}) is on or before the last settlement ({fmtDate(lastSettledDate)}). Choose a later date.
                        </Alert>
                      ) : (
                        <Alert severity="success">
                          All caught up! No pending settlements up to {fmtDate(createForm.endDate)}.
                        </Alert>
                      )}
                    </Grid>
                  ) : batchPreviewDays.length === 1 ? (
                    /* Single-day form — supports partial settlement */
                    <>
                      <Grid item xs={12}>
                        <Paper
                          variant="outlined"
                          sx={{ p: 3, borderRadius: '12px', backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
                        >
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                            Settlement Summary — {fmtDate(batchPreviewDays[0].date)}
                          </Typography>
                          <Grid container spacing={2}>
                            {[
                              { label: 'Total Income', value: batchPreviewDays[0].totalIncome, color: '#10b981' },
                              { label: 'Total Expenses', value: batchPreviewDays[0].totalExpenses, color: '#ef4444' },
                              { label: 'Net Amount', value: batchPreviewDays[0].netAmount, color: '#6366f1' },
                              { label: 'Carry Forward', value: batchPreviewDays[0].carryForwardAmount, color: '#f59e0b' },
                              { label: 'Final Amount', value: batchPreviewDays[0].finalAmount, color: '#000666' },
                            ].map(({ label, value, color }) => (
                              <Grid item xs={6} sm={2} key={label}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                                  <Typography variant="h5" sx={{ fontWeight: 700, color }}>
                                    {formatCurrency(Number(value))}
                                  </Typography>
                                </Box>
                              </Grid>
                            ))}
                            <Grid item xs={12}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <LockIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                                <Typography variant="caption" color="text.secondary">
                                  Carry forward is auto-set from previous settlement's remaining amount
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>

                      {/* Settled amount for partial settlement */}
                      <Grid item xs={12} sm={6}>
                        {(() => {
                          const finalAmt = batchPreviewDays[0].finalAmount;
                          return (
                            <TextField
                              fullWidth
                              label="Settled Amount"
                              type="number"
                              value={singleSettledAmount}
                              onChange={(e) => setSingleSettledAmount(e.target.value)}
                              helperText={`Leave blank to settle full amount (${formatCurrency(finalAmt)})`}
                              inputProps={{ min: 0, max: finalAmt, step: 1 }}
                              InputProps={{
                                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              }}
                            />
                          );
                        })()}
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Notes (optional)"
                          value={createForm.notes}
                          onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                          multiline
                          rows={2}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                          <Button variant="outlined" onClick={() => dispatch(clearBatchPreview())}>
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            onClick={handleSingleDaySubmit}
                            disabled={submitting}
                            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
                            sx={{ minWidth: 160 }}
                          >
                            {submitting ? 'Submitting...' : 'Submit Settlement'}
                          </Button>
                        </Box>
                      </Grid>
                    </>
                  ) : (
                    /* Multi-day batch table */
                    <>
                      <Grid item xs={12}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                          Pending Settlements ({fmtDate(batchPreviewDays[0].date)} – {fmtDate(batchPreviewDays[batchPreviewDays.length - 1].date)})
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                          <LockIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                          <Typography variant="caption" color="text.secondary">
                            Carry forward is auto-set from previous settlement. All days fully settled.
                          </Typography>
                        </Box>
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px' }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">Income</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">Expenses</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">Net</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                    <LockIcon sx={{ fontSize: 13, color: '#94a3b8' }} />
                                    Carry Fwd
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">Final</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {batchPreviewDays.map((day: BatchPreviewDay) => (
                                <TableRow key={day.date} hover>
                                  <TableCell>{fmtDate(day.date)}</TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 600 }}>
                                      {formatCurrency(day.totalIncome)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 600 }}>
                                      {formatCurrency(day.totalExpenses)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {formatCurrency(day.netAmount)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                                      {formatCurrency(day.carryForwardAmount)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                      {formatCurrency(day.finalAmount)}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {/* Totals row */}
                              <TableRow sx={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                                <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Total ({batchPreviewDays.length} days)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#10b981' }}>
                                  {formatCurrency(batchPreviewDays.reduce((s: number, d: BatchPreviewDay) => s + d.totalIncome, 0))}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#ef4444' }}>
                                  {formatCurrency(batchPreviewDays.reduce((s: number, d: BatchPreviewDay) => s + d.totalExpenses, 0))}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
                                  {formatCurrency(batchPreviewDays.reduce((s: number, d: BatchPreviewDay) => s + d.netAmount, 0))}
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 800, fontSize: '1.1rem' }}>
                                  {formatCurrency(batchPreviewDays[0].carryForwardAmount)}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                                  {formatCurrency(batchPreviewDays.reduce((s: number, d: BatchPreviewDay) => s + d.finalAmount, 0))}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        {(() => {
                          const totalFinal = batchPreviewDays.reduce((s: number, d: BatchPreviewDay) => s + d.finalAmount, 0);
                          const maxSettleable = Math.max(totalFinal, 0);
                          return (
                            <TextField
                              fullWidth
                              label="Settled Amount"
                              type="number"
                              value={batchSettledAmount}
                              onChange={(e) => setBatchSettledAmount(e.target.value)}
                              helperText={`Leave blank to settle full amount (${formatCurrency(maxSettleable)})`}
                              inputProps={{ min: 0, max: maxSettleable, step: 1 }}
                              InputProps={{
                                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              }}
                            />
                          );
                        })()}
                      </Grid>

                      <Grid item xs={12} sm={8}>
                        <TextField
                          fullWidth
                          label="Notes (optional — applied to all settlements)"
                          value={createForm.notes}
                          onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                          multiline
                          rows={2}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                          <Button variant="outlined" onClick={() => dispatch(clearBatchPreview())}>
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            onClick={handleBatchSubmit}
                            disabled={submitting}
                            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
                            sx={{ minWidth: 200 }}
                          >
                            {submitting
                              ? 'Submitting...'
                              : `Create ${batchPreviewDays.length} Settlements`}
                          </Button>
                        </Box>
                      </Grid>
                    </>
                  )}
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
                    {settlements.map((item) => {
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
                              <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Net</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(b.netAmount)}</Typography></Box>
                              {b.carryForwardAmount > 0 && (
                                <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Carry Fwd</Typography><Typography variant="body2" sx={{ fontWeight: 700, color: '#0ea5e9' }}>{formatCurrency(b.carryForwardAmount)}</Typography></Box>
                              )}
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Settled</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#6366f1' }}>{formatCurrency(Math.max(0, b.settledAmount))}</Typography>
                                {b.finalAmount > 0 && b.finalAmount !== b.settledAmount && (
                                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>of {formatCurrency(b.finalAmount)}</Typography>
                                )}
                              </Box>
                              {b.remainingAmount > 0 && (
                                <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Remaining</Typography><Typography variant="body2" sx={{ fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(b.remainingAmount)}</Typography></Box>
                              )}
                            </Box>
                            <Button
                              size="small"
                              onClick={() => setExpandedBatchId(expandedBatchId === b.batchId ? null : b.batchId)}
                              endIcon={expandedBatchId === b.batchId ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                              sx={{ textTransform: 'none', color: '#6366f1', fontWeight: 600, fontSize: '0.75rem', px: 0 }}
                            >
                              {expandedBatchId === b.batchId ? 'Hide days' : 'Show days'}
                            </Button>
                            <Collapse in={expandedBatchId === b.batchId} timeout="auto" unmountOnExit>
                              <Box sx={{ mb: 1 }}>
                                {b.days.map((d) => (
                                  <Box key={d.date} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eef2f7' }}>
                                    <Typography variant="body2" sx={{ color: '#475569' }}>{fmtDate(d.date)}</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(d.netAmount)}</Typography>
                                  </Box>
                                ))}
                              </Box>
                            </Collapse>
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
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#6366f1', fontSize: '0.78rem' }}>{s.settlementNumber}</Typography>
                            <Chip label={sc.label} size="small" sx={{ backgroundColor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.68rem' }} />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>{s.center?.centerName || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">{fmtDate(s.settlementDate)}</Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mt: 1.5, mb: 1 }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Net</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(Number(s.netAmount))}</Typography>
                            </Box>
                            {Number(s.carryForwardAmount) > 0 && (
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Carry Fwd</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0ea5e9' }}>{formatCurrency(Number(s.carryForwardAmount))}</Typography>
                              </Box>
                            )}
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Settled</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#6366f1' }}>{formatCurrency(Math.max(0, Number(s.settledAmount)))}</Typography>
                            </Box>
                            {Number(s.remainingAmount) > 0 && (
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Remaining</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(Number(s.remainingAmount))}</Typography>
                              </Box>
                            )}
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
                              <Tooltip title="Request Edit"><IconButton size="small" onClick={() => { setEditRequestSettlement(s); setEditRequestReason(''); setEditRequestFields({ settlementDate: s.settlementDate ? s.settlementDate.slice(0, 10) : '', notes: s.notes || '' }); }} sx={{ color: '#f59e0b' }}><EditNoteIcon fontSize="small" /></IconButton></Tooltip>
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
                        <TableCell sortDirection={sort.field === 'netAmount' ? sort.order : false}>
                          <TableSortLabel active={sort.field === 'netAmount'} direction={sort.field === 'netAmount' ? sort.order : 'desc'} onClick={() => handleSort('netAmount')}>Net Amount</TableSortLabel>
                        </TableCell>
                        <TableCell>Last Carry Fwd</TableCell>
                        <TableCell>Settled</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Remaining</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>{Array.from({ length: isAdmin ? 9 : 8 }).map((__, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>
                          ))
                        : settlements.length === 0
                        ? (
                          <TableRow><TableCell colSpan={isAdmin ? 9 : 8} align="center" sx={{ py: 5 }}><Typography color="text.secondary">No settlements found</Typography></TableCell></TableRow>
                        )
                        : settlements.map((item) => {
                            if (item.type === 'batch') {
                              const b = item as BatchSettlementGroup;
                              const sc = statusConfig[b.status];
                              const isExpanded = expandedBatchId === b.batchId;
                              return (
                                <React.Fragment key={b.batchId}>
                                <TableRow hover sx={{ backgroundColor: '#f8f7ff' }}>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <IconButton size="small" onClick={() => setExpandedBatchId(isExpanded ? null : b.batchId)} sx={{ color: '#6366f1' }}>
                                        {isExpanded ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                                      </IconButton>
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Chip label="BATCH" size="small" sx={{ backgroundColor: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.65rem', width: 'fit-content' }} />
                                        <Typography variant="caption" sx={{ color: '#64748b' }}>{b.count} settlements</Typography>
                                      </Box>
                                    </Box>
                                  </TableCell>
                                  <TableCell>{b.centerName}</TableCell>
                                  <TableCell>
                                    <Typography variant="body2">{fmtDate(b.startDate)} – {fmtDate(b.endDate)}</Typography>
                                  </TableCell>
                                  <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(b.netAmount)}</Typography></TableCell>
                                  <TableCell>
                                    {b.carryForwardAmount > 0
                                      ? <Typography variant="body2" sx={{ fontWeight: 600, color: '#0ea5e9' }}>{formatCurrency(b.carryForwardAmount)}</Typography>
                                      : <Typography variant="body2" sx={{ color: '#94a3b8' }}>—</Typography>}
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#6366f1' }}>
                                      {formatCurrency(Math.max(0, b.settledAmount))}
                                    </Typography>
                                    {b.finalAmount > 0 && b.finalAmount !== b.settledAmount && (
                                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                        of {formatCurrency(b.finalAmount)}
                                      </Typography>
                                    )}
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
                                <TableRow>
                                  <TableCell colSpan={isAdmin ? 9 : 8} sx={{ py: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                      <Box sx={{ py: 1.5, px: 2, backgroundColor: '#fbfaff' }}>
                                        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Day-wise net amount</Typography>
                                        {b.days.map((d) => (
                                          <Box key={d.date} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.6, borderBottom: '1px solid #eef2f7' }}>
                                            <Typography variant="body2" sx={{ color: '#475569' }}>{fmtDate(d.date)}</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(d.netAmount)}</Typography>
                                          </Box>
                                        ))}
                                      </Box>
                                    </Collapse>
                                  </TableCell>
                                </TableRow>
                                </React.Fragment>
                              );
                            }
                            const s = item as Settlement;
                            const sc = statusConfig[s.status];
                            return (
                              <TableRow key={s.id} hover>
                                <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: '#6366f1' }}>{s.settlementNumber}</Typography></TableCell>
                                <TableCell>{s.center?.centerName || '—'}</TableCell>
                                <TableCell>
                                  <Typography variant="body2">{fmtDate(s.settlementDate)}</Typography>
                                  {s.createdAt && <Typography variant="caption" sx={{ color: '#64748b' }}>{(() => { try { return format(new Date(s.createdAt), 'hh:mm a'); } catch { return ''; } })()}</Typography>}
                                </TableCell>
                                <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(Number(s.netAmount))}</Typography></TableCell>
                                <TableCell>
                                  {Number(s.carryForwardAmount) > 0
                                    ? <Typography variant="body2" sx={{ fontWeight: 600, color: '#0ea5e9' }}>{formatCurrency(Number(s.carryForwardAmount))}</Typography>
                                    : <Typography variant="body2" sx={{ color: '#94a3b8' }}>—</Typography>}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#6366f1' }}>
                                    {formatCurrency(Math.max(0, Number(s.settledAmount)))}
                                  </Typography>
                                  {Number(s.finalAmount) > 0 && Number(s.finalAmount) !== Number(s.settledAmount) && (
                                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                      of {formatCurrency(Number(s.finalAmount))}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell><Chip label={sc.label} size="small" sx={{ backgroundColor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.7rem' }} /></TableCell>
                                <TableCell>
                                  {Number(s.remainingAmount) > 0 ? (
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                                      {formatCurrency(Number(s.remainingAmount))}
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>—</Typography>
                                  )}
                                </TableCell>
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
                                      <Tooltip title="Request Edit"><IconButton size="small" onClick={() => { setEditRequestSettlement(s); setEditRequestReason(''); setEditRequestFields({ settlementDate: s.settlementDate ? s.settlementDate.slice(0, 10) : '', notes: s.notes || '' }); }} sx={{ color: '#f59e0b' }}><EditNoteIcon fontSize="small" /></IconButton></Tooltip>
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Settlement Date"
                type="date"
                value={editRequestFields.settlementDate}
                onChange={(e) => setEditRequestFields((f) => ({ ...f, settlementDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
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

      {/* Reject dialog */}
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
