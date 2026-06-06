import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  IconButton,
  Chip,
  Tooltip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  Alert,
  Skeleton,
  InputAdornment,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  EditNote as EditNoteIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchTransactions, deleteTransaction, updateTransaction } from './transactionSlice';
import { fetchIncomeSources, fetchVehicleTypes } from '../masterData/masterDataSlice';
import { fetchCenters } from '../admin/centerSlice';
import { createEditRequest } from '../editRequests/editRequestSlice';
import type { Transaction } from '../../types';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const fmtDate = (d: string) => { try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; } };

export const TransactionListPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { transactions, loading, pagination } = useAppSelector((state) => state.transactions);
  const { incomeSources, vehicleTypes } = useAppSelector((state) => state.masterData);
  const { centers } = useAppSelector((state) => state.centers);
  const isAdmin = user?.role === 'ADMIN';

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ field: 'transactionDate' | 'amount'; order: 'asc' | 'desc' }>({
    field: 'transactionDate',
    order: 'desc',
  });
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    vehicleTypeId: '',
    incomeSourceId: '',
    centerId: '',
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({ vehicleNumber: '', amount: '', notes: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editRequestTx, setEditRequestTx] = useState<Transaction | null>(null);
  const [editRequestReason, setEditRequestReason] = useState('');
  const [editRequestFields, setEditRequestFields] = useState({ vehicleNumber: '', amount: '', notes: '' });
  const [editRequestSubmitting, setEditRequestSubmitting] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' as 'success' | 'error' });

  const handleSort = (field: 'transactionDate' | 'amount') => {
    setSort((s) => ({ field, order: s.field === field && s.order === 'asc' ? 'desc' : 'asc' }));
    setPage(0);
  };

  const loadData = useCallback(() => {
    dispatch(
      fetchTransactions({
        page: page + 1,
        limit: rowsPerPage,
        search: search || undefined,
        sortBy: sort.field,
        sortOrder: sort.order,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      })
    );
  }, [dispatch, page, rowsPerPage, search, sort, filters]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    dispatch(fetchIncomeSources());
    dispatch(fetchVehicleTypes());
    if (isAdmin) dispatch(fetchCenters());
  }, [dispatch, isAdmin]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await dispatch(deleteTransaction(deleteId)).unwrap();
      setSnack({ open: true, msg: 'Transaction deleted.', severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Failed to delete.', severity: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  const openEditTx = (tx: Transaction) => {
    setEditTx(tx);
    setEditForm({ vehicleNumber: tx.vehicleNumber, amount: String(tx.amount), notes: tx.notes || '' });
  };

  const handleEditSave = async () => {
    if (!editTx) return;
    setEditSaving(true);
    try {
      await dispatch(updateTransaction({ id: editTx.id, data: { vehicleNumber: editForm.vehicleNumber, amount: parseFloat(editForm.amount), notes: editForm.notes } })).unwrap();
      setSnack({ open: true, msg: 'Transaction updated.', severity: 'success' });
      setEditTx(null);
    } catch {
      setSnack({ open: true, msg: 'Failed to update.', severity: 'error' });
    } finally {
      setEditSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['#', 'Transaction No', 'Vehicle No', 'Vehicle Type', 'Income Source', 'Amount', 'Date', 'Center'];
    const rows = transactions.map((t, i) => [i + 1, t.transactionNumber, t.vehicleNumber, t.vehicleType?.typeName || '', t.incomeSource?.sourceName || '', t.amount, t.transactionDate, t.center?.centerName || '']);
    const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ActionButtons = ({ tx }: { tx: Transaction }) => (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {isAdmin ? (
        <>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEditTx(tx)} sx={{ color: '#6366f1' }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => setDeleteId(tx.id)} sx={{ color: '#ef4444' }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ) : (
        <Tooltip title="Request Edit">
          <IconButton size="small" onClick={() => { setEditRequestTx(tx); setEditRequestReason(''); setEditRequestFields({ vehicleNumber: tx.vehicleNumber, amount: String(tx.amount), notes: tx.notes || '' }); }} sx={{ color: '#f59e0b' }}>
            <EditNoteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>All Transactions</Typography>
          <Typography variant="body2" color="text.secondary">{pagination?.total ?? 0} total records</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {!isMobile && (
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCSV} size="small"
              sx={{ borderColor: '#e2e8f0', color: '#475569', '&:hover': { borderColor: '#000666', color: '#000666' } }}>
              Export CSV
            </Button>
          )}
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/transactions/entry')} size="small"
            sx={{ background: 'linear-gradient(135deg, #000666 0%, #1a237e 100%)', boxShadow: '0 4px 12px rgba(0,6,102,0.25)' }}>
            New Transaction
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterIcon sx={{ color: '#6366f1', fontSize: 18 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Filters</Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: isAdmin ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)', lg: isAdmin ? 'repeat(6, 1fr)' : 'repeat(5, 1fr)' }, gap: 1.5 }}>
            <TextField
              size="small" label="Search vehicle" value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }}
            />
            <TextField size="small" label="From Date" type="date" value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} InputLabelProps={{ shrink: true }} />
            <TextField size="small" label="To Date" type="date" value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} InputLabelProps={{ shrink: true }} />
            <TextField size="small" select label="Vehicle Type" value={filters.vehicleTypeId}
              onChange={(e) => setFilters((f) => ({ ...f, vehicleTypeId: e.target.value }))}>
              <MenuItem value="">All</MenuItem>
              {vehicleTypes.map((vt) => <MenuItem key={vt.id} value={vt.id}>{vt.typeName}</MenuItem>)}
            </TextField>
            <TextField size="small" select label="Income Source" value={filters.incomeSourceId}
              onChange={(e) => setFilters((f) => ({ ...f, incomeSourceId: e.target.value }))}>
              <MenuItem value="">All</MenuItem>
              {incomeSources.map((s) => <MenuItem key={s.id} value={s.id}>{s.sourceName}</MenuItem>)}
            </TextField>
            {isAdmin && (
              <TextField size="small" select label="Center" value={filters.centerId}
                onChange={(e) => setFilters((f) => ({ ...f, centerId: e.target.value }))}>
                <MenuItem value="">All Centers</MenuItem>
                {centers.map((c) => <MenuItem key={c.id} value={c.id}>{c.centerName}</MenuItem>)}
              </TextField>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Mobile card list */}
      {isMobile ? (
        <Card>
          {loading ? (
            <Stack divider={<Divider />}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Box key={i} sx={{ p: 2 }}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                  <Skeleton variant="text" width="50%" />
                </Box>
              ))}
            </Stack>
          ) : transactions.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography color="text.secondary">No transactions found</Typography>
            </Box>
          ) : (
            <Stack divider={<Divider />}>
              {transactions.map((tx) => (
                <Box key={tx.id} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#6366f1', fontSize: '0.78rem' }}>
                      {tx.transactionNumber}
                    </Typography>
                    <Chip label={tx.isLocked ? 'Locked' : 'Active'} size="small"
                      sx={{ backgroundColor: tx.isLocked ? 'rgba(100,116,139,0.12)' : 'rgba(16,185,129,0.12)', color: tx.isLocked ? '#64748b' : '#10b981', fontWeight: 600, fontSize: '0.68rem' }} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{tx.vehicleNumber}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
                    {tx.vehicleType && (
                      <Chip label={tx.vehicleType.typeCode} size="small"
                        sx={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 600, fontSize: '0.68rem' }} />
                    )}
                    <Typography variant="caption" color="text.secondary">{tx.incomeSource?.sourceName || '—'}</Typography>
                    {tx.center && <Typography variant="caption" color="text.secondary">· {tx.center.centerName}</Typography>}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>{formatCurrency(Number(tx.amount))}</Typography>
                      <Typography variant="caption" color="text.secondary">{fmtDate(tx.transactionDate)}</Typography>
                    </Box>
                    <ActionButtons tx={tx} />
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
          <TablePagination
            component="div"
            count={pagination?.total ?? transactions.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25]}
            labelRowsPerPage=""
          />
        </Card>
      ) : (
        /* Desktop table */
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Transaction No</TableCell>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell sortDirection={sort.field === 'amount' ? sort.order : false}>
                    <TableSortLabel active={sort.field === 'amount'} direction={sort.field === 'amount' ? sort.order : 'desc'} onClick={() => handleSort('amount')}>Amount</TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sort.field === 'transactionDate' ? sort.order : false}>
                    <TableSortLabel active={sort.field === 'transactionDate'} direction={sort.field === 'transactionDate' ? sort.order : 'desc'} onClick={() => handleSort('transactionDate')}>Date</TableSortLabel>
                  </TableCell>
                  <TableCell>Center</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 10 }).map((__, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}
                      </TableRow>
                    ))
                  : transactions.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 5 }}>
                        <Typography color="text.secondary">No transactions found</Typography>
                      </TableCell>
                    </TableRow>
                  )
                  : transactions.map((tx, idx) => (
                      <TableRow key={tx.id} hover>
                        <TableCell sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>{page * rowsPerPage + idx + 1}</TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: '#6366f1' }}>{tx.transactionNumber}</Typography></TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{tx.vehicleNumber}</Typography></TableCell>
                        <TableCell>
                          <Chip label={tx.vehicleType?.typeCode || '—'} size="small"
                            sx={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 600, fontSize: '0.7rem' }} />
                        </TableCell>
                        <TableCell><Typography variant="body2">{tx.incomeSource?.sourceName || '—'}</Typography></TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(Number(tx.amount))}</Typography></TableCell>
                        <TableCell>
                          <Typography variant="body2">{fmtDate(tx.transactionDate)}</Typography>
                          {tx.transactionTime && <Typography variant="caption" sx={{ color: '#64748b' }}>{(() => { try { return format(new Date(tx.transactionTime), 'hh:mm a'); } catch { return ''; } })()}</Typography>}
                        </TableCell>
                        <TableCell><Typography variant="body2">{tx.center?.centerName || '—'}</Typography></TableCell>
                        <TableCell>
                          <Chip label={tx.isLocked ? 'Locked' : 'Active'} size="small"
                            sx={{ backgroundColor: tx.isLocked ? 'rgba(100,116,139,0.12)' : 'rgba(16,185,129,0.12)', color: tx.isLocked ? '#64748b' : '#10b981', fontWeight: 600, fontSize: '0.7rem' }} />
                        </TableCell>
                        <TableCell align="center"><ActionButtons tx={tx} /></TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={pagination?.total ?? transactions.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Card>
      )}

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Delete</DialogTitle>
        <DialogContent><DialogContentText>Are you sure you want to delete this transaction? This action cannot be undone.</DialogContentText></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteId(null)} variant="outlined">Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTx} onClose={() => setEditTx(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Transaction</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Vehicle Number" value={editForm.vehicleNumber} onChange={(e) => setEditForm((f) => ({ ...f, vehicleNumber: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Amount" type="number" value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} inputProps={{ min: 0, step: 0.01 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Notes" value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} multiline rows={2} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setEditTx(null)} variant="outlined">Cancel</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={editSaving || !editForm.vehicleNumber || !editForm.amount}>
            {editSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Request Dialog */}
      <Dialog open={!!editRequestTx} onClose={() => setEditRequestTx(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Request Edit — {editRequestTx?.transactionNumber}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>Update the fields you want changed. Only modified fields will be sent for approval.</Alert>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Vehicle Number" value={editRequestFields.vehicleNumber} onChange={(e) => setEditRequestFields((f) => ({ ...f, vehicleNumber: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Amount" type="number" value={editRequestFields.amount} onChange={(e) => setEditRequestFields((f) => ({ ...f, amount: e.target.value }))} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} inputProps={{ min: 0, step: 0.01 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Notes" value={editRequestFields.notes} onChange={(e) => setEditRequestFields((f) => ({ ...f, notes: e.target.value }))} multiline rows={2} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required label="Reason for change" value={editRequestReason} onChange={(e) => setEditRequestReason(e.target.value)} multiline rows={2} placeholder="Explain why these changes are needed..." />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setEditRequestTx(null)} variant="outlined">Cancel</Button>
          <Button variant="contained" disabled={!editRequestReason || editRequestSubmitting}
            sx={{ color: '#fff', '&.Mui-disabled': { color: 'rgba(255,255,255,0.5)' } }}
            onClick={async () => {
              if (!editRequestTx || !editRequestReason) return;
              setEditRequestSubmitting(true);
              try {
                const proposedChanges: Record<string, unknown> = {};
                if (editRequestFields.vehicleNumber !== editRequestTx.vehicleNumber) proposedChanges.vehicleNumber = editRequestFields.vehicleNumber;
                if (editRequestFields.amount && Number(editRequestFields.amount) !== editRequestTx.amount) proposedChanges.amount = Number(editRequestFields.amount);
                if (editRequestFields.notes !== (editRequestTx.notes || '')) proposedChanges.notes = editRequestFields.notes;
                await dispatch(createEditRequest({ transactionId: editRequestTx.id, resourceType: 'TRANSACTION', requestReason: editRequestReason, proposedChanges })).unwrap();
                setSnack({ open: true, msg: 'Edit request submitted successfully.', severity: 'success' });
                setEditRequestTx(null);
                setEditRequestReason('');
              } catch (err: unknown) {
                setSnack({ open: true, msg: typeof err === 'string' ? err : 'Failed to submit request', severity: 'error' });
              } finally {
                setEditRequestSubmitting(false);
              }
            }}>
            {editRequestSubmitting ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};
