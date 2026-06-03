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
  IconButton,
  Tooltip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TableSortLabel,
  TablePagination,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  MoneyOff as MoneyOffIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  EditNote as EditNoteIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchExpenses,
  createExpense,
  fetchCategories,
  approveExpense,
  rejectExpense,
  deleteExpense,
  updateExpense,
} from './expenseSlice';
import { fetchCenters } from '../admin/centerSlice';
import { createEditRequest } from '../editRequests/editRequestSlice';
import type { Expense } from '../../types';
import { PAYMENT_MODES, type PaymentModeValue } from '../../utils/paymentModes';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const statusConfig: Record<Expense['status'], { label: string; bg: string; color: string }> = {
  PENDING: { label: 'Pending', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  APPROVED: { label: 'Approved', bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  REJECTED: { label: 'Rejected', bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
};

const fmtDate = (d: string) => { try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; } };

export const ExpensesPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { expenses, categories, loading, pagination } = useAppSelector((state) => state.expenses);
  const { centers } = useAppSelector((state) => state.centers);
  const isAdmin = user?.role === 'ADMIN';

  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [centerFilter, setCenterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ field: 'expenseDate' | 'amount'; order: 'asc' | 'desc' }>({
    field: 'expenseDate',
    order: 'desc',
  });

  const handleSort = (field: 'expenseDate' | 'amount') => {
    setSort((s) => ({ field, order: s.field === field && s.order === 'asc' ? 'desc' : 'asc' }));
    setPage(0);
  };
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' as 'success' | 'error' });
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editExp, setEditExp] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({ amount: '', vendorName: '', description: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editRequestExp, setEditRequestExp] = useState<Expense | null>(null);
  const [editRequestReason, setEditRequestReason] = useState('');
  const [editRequestFields, setEditRequestFields] = useState({ amount: '', vendorName: '', description: '' });
  const [editRequestSubmitting, setEditRequestSubmitting] = useState(false);

  const [form, setForm] = useState({
    centerId: user?.centers?.[0]?.id || '',
    categoryId: '',
    amount: '',
    paymentMode: 'CASH' as PaymentModeValue,
    vendorName: '',
    description: '',
    expenseDate: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    dispatch(fetchCategories());
    if (isAdmin) dispatch(fetchCenters());
  }, [dispatch, isAdmin]);

  useEffect(() => {
    const params: Record<string, unknown> = {
      page: page + 1,
      limit: rowsPerPage,
      sortBy: sort.field,
      sortOrder: sort.order,
    };
    if (centerFilter) params.centerId = centerFilter;
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.categoryId = categoryFilter;
    if (dateFrom) params.startDate = dateFrom;
    if (dateTo) params.endDate = dateTo;
    if (search) params.search = search;
    dispatch(fetchExpenses(params));
  }, [dispatch, page, rowsPerPage, centerFilter, statusFilter, categoryFilter, dateFrom, dateTo, search, sort]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.centerId || !form.categoryId || !form.amount) {
      setSnack({ open: true, msg: 'Please fill all required fields.', severity: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await dispatch(
        createExpense({ ...form, amount: parseFloat(form.amount) })
      ).unwrap();
      setSnack({ open: true, msg: 'Expense added successfully!', severity: 'success' });
      setForm({
        centerId: user?.centers?.[0]?.id || '',
        categoryId: '',
        amount: '',
        paymentMode: 'CASH',
        vendorName: '',
        description: '',
        expenseDate: format(new Date(), 'yyyy-MM-dd'),
      });
    } catch (err: unknown) {
      setSnack({ open: true, msg: typeof err === 'string' ? err : 'Failed to add expense', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await dispatch(approveExpense(id)).unwrap();
      setSnack({ open: true, msg: 'Expense approved!', severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Failed to approve.', severity: 'error' });
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason) return;
    try {
      await dispatch(rejectExpense({ expenseId: rejectId, rejectionReason: rejectReason })).unwrap();
      setSnack({ open: true, msg: 'Expense rejected.', severity: 'success' });
      setRejectId(null);
      setRejectReason('');
    } catch {
      setSnack({ open: true, msg: 'Failed to reject.', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await dispatch(deleteExpense(deleteId)).unwrap();
      setSnack({ open: true, msg: 'Expense deleted.', severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Failed to delete.', severity: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  const openEditExp = (exp: Expense) => {
    setEditExp(exp);
    setEditForm({ amount: String(exp.amount), vendorName: exp.vendorName || '', description: exp.description || '' });
  };

  const handleEditSave = async () => {
    if (!editExp) return;
    setEditSaving(true);
    try {
      await dispatch(updateExpense({ id: editExp.id, data: { amount: parseFloat(editForm.amount), vendorName: editForm.vendorName, description: editForm.description } })).unwrap();
      setSnack({ open: true, msg: 'Expense updated.', severity: 'success' });
      setEditExp(null);
    } catch {
      setSnack({ open: true, msg: 'Failed to update.', severity: 'error' });
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
          Expenses
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage and track operational expenses
        </Typography>
      </Box>

      <Card>
        <Box sx={{ borderBottom: '1px solid #e2e8f0' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3 }}>
            <Tab label="Add Expense" icon={<AddIcon />} iconPosition="start" />
            <Tab label="All Expenses" icon={<MoneyOffIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Add Expense Tab */}
        {tab === 0 && (
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label="Center *"
                    name="centerId"
                    value={form.centerId}
                    onChange={handleChange}
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
                    select
                    label="Category *"
                    name="categoryId"
                    value={form.categoryId}
                    onChange={handleChange}
                  >
                    <MenuItem value="">Select category</MenuItem>
                    {categories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.categoryName}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Amount *"
                    name="amount"
                    type="number"
                    value={form.amount}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label="Payment Mode *"
                    name="paymentMode"
                    value={form.paymentMode}
                    onChange={handleChange}
                  >
                    {PAYMENT_MODES.map((m) => (
                      <MenuItem key={m.value} value={m.value}>
                        {m.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Vendor Name"
                    name="vendorName"
                    value={form.vendorName}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Expense Date *"
                    name="expenseDate"
                    type="date"
                    value={form.expenseDate}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    multiline
                    rows={2}
                    placeholder="Describe the expense..."
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
                      disabled={submitting}
                      sx={{ minWidth: 160 }}
                    >
                      {submitting ? 'Adding...' : 'Add Expense'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        )}

        {/* All Expenses Tab */}
        {tab === 1 && (
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Filters */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: isAdmin ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)', lg: isAdmin ? 'repeat(6, 1fr)' : 'repeat(5, 1fr)' }, gap: 1.5, mb: 2 }}>
              <TextField size="small" placeholder="Search vendor / no" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }} />
              <TextField size="small" label="From Date" type="date" value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
              <TextField size="small" label="To Date" type="date" value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
              <TextField select size="small" label="Category" value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.categoryName}</MenuItem>)}
              </TextField>
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
                    {Array.from({ length: 4 }).map((_, i) => <Box key={i} sx={{ p: 2 }}><Skeleton variant="text" width="60%" /><Skeleton variant="text" width="40%" /></Box>)}
                  </Stack>
                ) : expenses.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}><Typography color="text.secondary">No expenses recorded yet</Typography></Box>
                ) : (
                  <Stack divider={<Divider />}>
                    {expenses.map((exp) => {
                      const sc = statusConfig[exp.status];
                      return (
                        <Box key={exp.id} sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#6366f1', fontSize: '0.78rem' }}>{exp.expenseNumber}</Typography>
                            <Chip label={sc.label} size="small" sx={{ backgroundColor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.68rem' }} />
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>{exp.category?.categoryName || '—'}</Typography>
                          {exp.vendorName && <Typography variant="caption" color="text.secondary">{exp.vendorName}</Typography>}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(Number(exp.amount))}</Typography>
                              <Typography variant="caption" color="text.secondary">{fmtDate(exp.expenseDate)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {isAdmin ? (
                                <>
                                  {exp.status === 'PENDING' && (
                                    <>
                                      <Tooltip title="Approve"><IconButton size="small" onClick={() => handleApprove(exp.id)} sx={{ color: '#10b981' }}><ApproveIcon fontSize="small" /></IconButton></Tooltip>
                                      <Tooltip title="Reject"><IconButton size="small" onClick={() => { setRejectId(exp.id); setRejectReason(''); }} sx={{ color: '#f59e0b' }}><RejectIcon fontSize="small" /></IconButton></Tooltip>
                                    </>
                                  )}
                                  <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditExp(exp)} sx={{ color: '#6366f1' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                                  <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteId(exp.id)} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                                </>
                              ) : (
                                <Tooltip title="Request Edit"><IconButton size="small" onClick={() => { setEditRequestExp(exp); setEditRequestReason(''); setEditRequestFields({ amount: String(exp.amount), vendorName: exp.vendorName || '', description: exp.description || '' }); }} sx={{ color: '#f59e0b' }}><EditNoteIcon fontSize="small" /></IconButton></Tooltip>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
                <TablePagination component="div" count={pagination?.total ?? expenses.length} page={page}
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
                        <TableCell>Expense No</TableCell>
                        {isAdmin && <TableCell>Center</TableCell>}
                        <TableCell>Category</TableCell>
                        <TableCell sortDirection={sort.field === 'amount' ? sort.order : false}>
                          <TableSortLabel active={sort.field === 'amount'} direction={sort.field === 'amount' ? sort.order : 'desc'} onClick={() => handleSort('amount')}>Amount</TableSortLabel>
                        </TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell sortDirection={sort.field === 'expenseDate' ? sort.order : false}>
                          <TableSortLabel active={sort.field === 'expenseDate'} direction={sort.field === 'expenseDate' ? sort.order : 'desc'} onClick={() => handleSort('expenseDate')}>Date</TableSortLabel>
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
                        : expenses.length === 0
                        ? (
                          <TableRow><TableCell colSpan={isAdmin ? 8 : 7} align="center" sx={{ py: 5 }}><Typography color="text.secondary">No expenses recorded yet</Typography></TableCell></TableRow>
                        )
                        : expenses.map((exp) => {
                            const sc = statusConfig[exp.status];
                            return (
                              <TableRow key={exp.id} hover>
                                <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: '#6366f1' }}>{exp.expenseNumber}</Typography></TableCell>
                                {isAdmin && <TableCell><Typography variant="body2">{(exp as any).center?.centerName || '—'}</Typography></TableCell>}
                                <TableCell>{exp.category?.categoryName || '—'}</TableCell>
                                <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(Number(exp.amount))}</Typography></TableCell>
                                <TableCell><Typography variant="body2" sx={{ color: '#475569', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={exp.description || ''}>{exp.description || '—'}</Typography></TableCell>
                                <TableCell>
                                  <Typography variant="body2">{fmtDate(exp.expenseDate)}</Typography>
                                  {exp.createdAt && <Typography variant="caption" sx={{ color: '#64748b' }}>{(() => { try { return format(new Date(exp.createdAt), 'hh:mm a'); } catch { return ''; } })()}</Typography>}
                                </TableCell>
                                <TableCell><Chip label={sc.label} size="small" sx={{ backgroundColor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.7rem' }} /></TableCell>
                                <TableCell align="center">
                                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                    {isAdmin ? (
                                      <>
                                        {exp.status === 'PENDING' && (
                                          <>
                                            <Tooltip title="Approve"><IconButton size="small" onClick={() => handleApprove(exp.id)} sx={{ color: '#10b981' }}><ApproveIcon fontSize="small" /></IconButton></Tooltip>
                                            <Tooltip title="Reject"><IconButton size="small" onClick={() => { setRejectId(exp.id); setRejectReason(''); }} sx={{ color: '#f59e0b' }}><RejectIcon fontSize="small" /></IconButton></Tooltip>
                                          </>
                                        )}
                                        <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditExp(exp)} sx={{ color: '#6366f1' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                                        <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteId(exp.id)} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                                      </>
                                    ) : (
                                      <Tooltip title="Request Edit"><IconButton size="small" onClick={() => { setEditRequestExp(exp); setEditRequestReason(''); setEditRequestFields({ amount: String(exp.amount), vendorName: exp.vendorName || '', description: exp.description || '' }); }} sx={{ color: '#f59e0b' }}><EditNoteIcon fontSize="small" /></IconButton></Tooltip>
                                    )}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination component="div" count={pagination?.total ?? expenses.length} page={page}
                  onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                  rowsPerPageOptions={[5, 10, 25, 50]} />
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* Reject dialog */}
      {rejectId && (
        <Box
          sx={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          }}
          onClick={() => setRejectId(null)}
        >
          <Card sx={{ maxWidth: 440, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Reject Expense
              </Typography>
              <TextField
                fullWidth
                label="Rejection Reason *"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                multiline
                rows={3}
                placeholder="Provide a reason for rejection..."
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => setRejectId(null)}>Cancel</Button>
                <Button variant="contained" color="error" onClick={handleReject} disabled={!rejectReason}>
                  Reject
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this expense? This cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteId(null)} variant="outlined">Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Edit expense */}
      <Dialog open={!!editExp} onClose={() => setEditExp(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Expense</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Vendor Name"
                value={editForm.vendorName}
                onChange={(e) => setEditForm((f) => ({ ...f, vendorName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setEditExp(null)} variant="outlined">Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" disabled={editSaving || !editForm.amount}>
            {editSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Expense edit request dialog */}
      <Dialog open={!!editRequestExp} onClose={() => setEditRequestExp(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Request Edit — {editRequestExp?.expenseNumber}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Update the fields you want changed. Only modified fields will be sent for approval.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={editRequestFields.amount}
                onChange={(e) => setEditRequestFields((f) => ({ ...f, amount: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Vendor Name"
                value={editRequestFields.vendorName}
                onChange={(e) => setEditRequestFields((f) => ({ ...f, vendorName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={editRequestFields.description}
                onChange={(e) => setEditRequestFields((f) => ({ ...f, description: e.target.value }))}
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
          <Button onClick={() => setEditRequestExp(null)} variant="outlined">Cancel</Button>
          <Button
            variant="contained"
            disabled={!editRequestReason || editRequestSubmitting}
            sx={{ color: '#fff', '&.Mui-disabled': { color: 'rgba(255,255,255,0.5)' } }}
            onClick={async () => {
              if (!editRequestExp || !editRequestReason) return;
              setEditRequestSubmitting(true);
              try {
                const proposedChanges: Record<string, unknown> = {};
                if (editRequestFields.amount && Number(editRequestFields.amount) !== editRequestExp.amount)
                  proposedChanges.amount = Number(editRequestFields.amount);
                if (editRequestFields.vendorName !== (editRequestExp.vendorName || ''))
                  proposedChanges.vendorName = editRequestFields.vendorName;
                if (editRequestFields.description !== (editRequestExp.description || ''))
                  proposedChanges.description = editRequestFields.description;
                await dispatch(createEditRequest({
                  expenseId: editRequestExp.id,
                  resourceType: 'EXPENSE',
                  requestReason: editRequestReason,
                  proposedChanges,
                })).unwrap();
                setSnack({ open: true, msg: 'Edit request submitted successfully.', severity: 'success' });
                setEditRequestExp(null);
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
