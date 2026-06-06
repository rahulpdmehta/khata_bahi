import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Skeleton,
  Snackbar,
  Alert,
  TextField,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchCenters, createCenter, updateCenter, deleteCenter } from './centerSlice';
import type { Center } from '../../types';

const defaultForm = {
  centerCode: '',
  centerName: '',
  address: '',
  contactNumber: '',
  email: '',
  isActive: true,
};

export const CenterManagementPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useAppDispatch();
  const { centers, loading } = useAppSelector((state) => state.centers);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    dispatch(fetchCenters());
  }, [dispatch]);

  const openAdd = () => {
    setEditingCenter(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Center) => {
    setEditingCenter(c);
    setForm({
      centerCode: c.centerCode,
      centerName: c.centerName,
      address: c.address || '',
      contactNumber: c.contactNumber || '',
      email: c.email || '',
      isActive: c.isActive,
    });
    setDialogOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async () => {
    if (!form.centerCode || !form.centerName) {
      setSnack({ open: true, msg: 'Center code and name are required.', severity: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      if (editingCenter) {
        await dispatch(updateCenter({ id: editingCenter.id, data: form })).unwrap();
        setSnack({ open: true, msg: 'Center updated successfully!', severity: 'success' });
      } else {
        await dispatch(createCenter(form)).unwrap();
        setSnack({ open: true, msg: 'Center created successfully!', severity: 'success' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      setSnack({ open: true, msg: typeof err === 'string' ? err : 'Operation failed', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = (c: Center) => {
    dispatch(updateCenter({ id: c.id, data: { isActive: !c.isActive } }));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await dispatch(deleteCenter(deleteId)).unwrap();
      setSnack({ open: true, msg: 'Center deleted.', severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Failed to delete center.', severity: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
            Center Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {centers.length} pollution testing centers
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          Add Center
        </Button>
      </Box>

      {isMobile ? (
        /* Mobile card list */
        <Card>
          {loading ? (
            <Stack divider={<Divider />}>
              {Array.from({ length: 4 }).map((_, i) => <Box key={i} sx={{ p: 2 }}><Skeleton variant="text" width="40%" /><Skeleton variant="text" width="70%" /></Box>)}
            </Stack>
          ) : centers.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <BusinessIcon sx={{ fontSize: 48, color: '#e2e8f0' }} />
              <Typography color="text.secondary">No centers configured</Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={openAdd} size="small">Add First Center</Button>
            </Box>
          ) : (
            <Stack divider={<Divider />}>
              {centers.map((c) => (
                <Box key={c.id} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                    <Box>
                      <Chip label={c.centerCode} size="small" sx={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 700, fontSize: '0.75rem', mb: 0.5 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.centerName}</Typography>
                      {c.address && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>{c.address}</Typography>}
                    </Box>
                    <Chip label={c.isActive ? 'Active' : 'Inactive'} size="small"
                      sx={{ backgroundColor: c.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)', color: c.isActive ? '#10b981' : '#64748b', fontWeight: 600, fontSize: '0.7rem' }} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Box>
                      {c.contactNumber && <Typography variant="caption" color="text.secondary">{c.contactNumber}</Typography>}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <Switch checked={c.isActive} size="small" color="success" onChange={() => handleToggleStatus(c)} />
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(c)} sx={{ color: '#6366f1' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteId(c.id)} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Card>
      ) : (
        /* Desktop table */
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Center Name</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>
                    ))
                  : centers.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <BusinessIcon sx={{ fontSize: 48, color: '#e2e8f0' }} />
                          <Typography color="text.secondary">No centers configured</Typography>
                          <Button variant="outlined" startIcon={<AddIcon />} onClick={openAdd} size="small">Add First Center</Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                  : centers.map((c) => (
                      <TableRow key={c.id} hover>
                        <TableCell><Chip label={c.centerCode} size="small" sx={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 700, fontSize: '0.75rem' }} /></TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{c.centerName}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }} noWrap>{c.address || '—'}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{c.contactNumber || '—'}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{c.email || '—'}</Typography></TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Switch checked={c.isActive} size="small" color="success" onChange={() => handleToggleStatus(c)} />
                            <Chip label={c.isActive ? 'Active' : 'Inactive'} size="small"
                              sx={{ backgroundColor: c.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)', color: c.isActive ? '#10b981' : '#64748b', fontWeight: 600, fontSize: '0.7rem' }} />
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(c)} sx={{ color: '#6366f1' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteId(c.id)} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingCenter ? 'Edit Center' : 'Add New Center'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Center Code"
                name="centerCode"
                value={form.centerCode}
                onChange={handleFormChange}
                size="small"
                disabled={!!editingCenter}
                helperText="Unique identifier, e.g. CTR001"
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Center Name"
                name="centerName"
                value={form.centerName}
                onChange={handleFormChange}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={form.address}
                onChange={handleFormChange}
                size="small"
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact Number"
                name="contactNumber"
                value={form.contactNumber}
                onChange={handleFormChange}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleFormChange}
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : editingCenter ? 'Save Changes' : 'Create Center'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Center</DialogTitle>
        <DialogContent>
          <Typography>Are you sure? This will remove the center and may affect linked users and records.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="outlined" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
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
