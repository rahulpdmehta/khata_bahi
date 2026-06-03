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
  MenuItem,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Switch,
  OutlinedInput,
  InputLabel,
  FormControl,
  Select,
  ListItemText,
  Checkbox,
  Tabs,
  Tab,
  Stack,
  Divider,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Business as CenterIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchUsers, createUser, updateUser, deleteUser } from './userSlice';
import { fetchCenters } from './centerSlice';
import { CenterManagementPage } from './CenterManagementPage';
import type { User } from '../../types';

const roleConfig: Record<User['role'], { label: string; bg: string; color: string }> = {
  ADMIN: { label: 'Admin', bg: 'rgba(99,102,241,0.12)', color: '#6366f1' },
  STAFF: { label: 'Staff', bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
};

const defaultForm = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'STAFF' as User['role'],
  centerIds: [] as string[],
};

export const UserManagementPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useAppDispatch();
  const { users, loading } = useAppSelector((state) => state.users);
  const { centers } = useAppSelector((state) => state.centers);

  const [managementTab, setManagementTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [centerDialogUser, setCenterDialogUser] = useState<User | null>(null);
  const [centerDialogIds, setCenterDialogIds] = useState<string[]>([]);
  const [centerSaving, setCenterSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' as 'success' | 'error' });

  const openCenterDialog = (u: User) => {
    setCenterDialogUser(u);
    setCenterDialogIds(u.centers?.map((c) => c.id) || []);
  };

  const handleCenterSave = async () => {
    if (!centerDialogUser) return;
    setCenterSaving(true);
    try {
      await dispatch(updateUser({ id: centerDialogUser.id, data: { centerIds: centerDialogIds } })).unwrap();
      setSnack({ open: true, msg: 'Centers updated successfully!', severity: 'success' });
      setCenterDialogUser(null);
    } catch {
      setSnack({ open: true, msg: 'Failed to update centers.', severity: 'error' });
    } finally {
      setCenterSaving(false);
    }
  };

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchCenters());
  }, [dispatch]);

  const openAdd = () => {
    setEditingUser(null);
    setForm(defaultForm);
    setShowPassword(false);
    setDialogOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({
      username: u.username,
      email: u.email,
      password: '',
      confirmPassword: '',
      role: u.role,
      centerIds: u.centers?.map((c) => c.id) || [],
    });
    setShowPassword(false);
    setDialogOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  // Confirm-password matters only when a password is being set (always for a
  // new user; only if the admin typed a new one when editing).
  const passwordMismatch = !!form.password && form.password !== form.confirmPassword;

  const handleSubmit = async () => {
    if (passwordMismatch) {
      setSnack({ open: true, msg: 'Passwords do not match.', severity: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      if (editingUser) {
        const data: Record<string, unknown> = { username: form.username, email: form.email, role: form.role, centerIds: form.centerIds };
        if (form.password) data.password = form.password;
        await dispatch(updateUser({ id: editingUser.id, data })).unwrap();
        setSnack({ open: true, msg: 'User updated successfully!', severity: 'success' });
      } else {
        await dispatch(createUser({ ...form })).unwrap();
        setSnack({ open: true, msg: 'User created successfully!', severity: 'success' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      setSnack({ open: true, msg: typeof err === 'string' ? err : 'Operation failed', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await dispatch(deleteUser(deleteId)).unwrap();
      setSnack({ open: true, msg: 'User deleted.', severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Failed to delete user.', severity: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>Management</Typography>
        <Typography variant="body2" color="text.secondary">Manage users and branch/center configuration</Typography>
      </Box>

      <Box sx={{ borderBottom: '1px solid #e2e8f0', mb: 3 }}>
        <Tabs value={managementTab} onChange={(_, v) => setManagementTab(v)}>
          <Tab label={`Users (${users.length})`} />
          <Tab label="Branches / Centers" />
        </Tabs>
      </Box>

      {managementTab === 1 && <CenterManagementPage />}

      {managementTab === 0 && <>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#0f172a' }}>
          {users.length} users registered
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          Add User
        </Button>
      </Box>

      {isMobile ? (
        /* Mobile card list */
        <Card>
          {loading ? (
            <Stack divider={<Divider />}>
              {Array.from({ length: 4 }).map((_, i) => <Box key={i} sx={{ p: 2 }}><Skeleton variant="text" width="60%" /><Skeleton variant="text" width="40%" /></Box>)}
            </Stack>
          ) : users.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <PeopleIcon sx={{ fontSize: 48, color: '#e2e8f0' }} />
              <Typography color="text.secondary">No users found</Typography>
            </Box>
          ) : (
            <Stack divider={<Divider />}>
              {users.map((u) => {
                const rc = roleConfig[u.role];
                return (
                  <Box key={u.id} sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <Avatar sx={{ width: 36, height: 36, background: u.role === 'ADMIN' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontSize: '0.8rem', fontWeight: 700 }}>
                        {u.username?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{u.username}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>{u.email}</Typography>
                      </Box>
                      <Chip label={rc.label} size="small" sx={{ backgroundColor: rc.bg, color: rc.color, fontWeight: 600, fontSize: '0.7rem' }} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {(u.centers || []).slice(0, 3).map((c) => <Chip key={c.id} label={c.centerCode} size="small" variant="outlined" sx={{ fontSize: '0.68rem' }} />)}
                        {(u.centers || []).length > 3 && <Chip label={`+${u.centers.length - 3}`} size="small" sx={{ fontSize: '0.68rem', backgroundColor: '#f1f5f9' }} />}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Switch checked={u.isActive !== false} size="small" color="success" onChange={() => dispatch(updateUser({ id: u.id, data: { isActive: !u.isActive } }))} />
                        <Tooltip title="Centers"><IconButton size="small" onClick={() => openCenterDialog(u)} sx={{ color: '#006b5e' }}><CenterIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(u)} sx={{ color: '#6366f1' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteId(u.id)} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
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
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Centers</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>
                    ))
                  : users.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <PeopleIcon sx={{ fontSize: 48, color: '#e2e8f0' }} />
                          <Typography color="text.secondary">No users found</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                  : users.map((u) => {
                      const rc = roleConfig[u.role];
                      return (
                        <TableRow key={u.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ width: 36, height: 36, background: u.role === 'ADMIN' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontSize: '0.8rem', fontWeight: 700 }}>
                                {u.username?.charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{u.username}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{u.email}</Typography></TableCell>
                          <TableCell><Chip label={rc.label} size="small" sx={{ backgroundColor: rc.bg, color: rc.color, fontWeight: 600, fontSize: '0.7rem' }} /></TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {(u.centers || []).slice(0, 2).map((c) => <Chip key={c.id} label={c.centerCode} size="small" variant="outlined" sx={{ fontSize: '0.68rem' }} />)}
                              {(u.centers || []).length > 2 && <Chip label={`+${u.centers.length - 2}`} size="small" sx={{ fontSize: '0.68rem', backgroundColor: '#f1f5f9' }} />}
                            </Box>
                          </TableCell>
                          <TableCell><Switch checked={u.isActive !== false} size="small" color="success" onChange={() => dispatch(updateUser({ id: u.id, data: { isActive: !u.isActive } }))} /></TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              <Tooltip title="Configure Centers"><IconButton size="small" onClick={() => openCenterDialog(u)} sx={{ color: '#006b5e' }}><CenterIcon fontSize="small" /></IconButton></Tooltip>
                              <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(u)} sx={{ color: '#6366f1' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                              <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteId(u.id)} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
      </>}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username *"
                name="username"
                value={form.username}
                onChange={handleFormChange}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email *"
                name="email"
                type="email"
                value={form.email}
                onChange={handleFormChange}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={editingUser ? 'New Password (optional)' : 'Password *'}
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleFormChange}
                size="small"
                helperText={
                  editingUser
                    ? "For security the existing password can't be displayed. Leave blank to keep it unchanged."
                    : ' '
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword((s) => !s)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={editingUser ? 'Confirm New Password' : 'Confirm Password *'}
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={handleFormChange}
                size="small"
                error={passwordMismatch}
                helperText={passwordMismatch ? 'Passwords do not match' : ' '}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword((s) => !s)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Role *"
                name="role"
                value={form.role}
                onChange={handleFormChange}
                size="small"
              >
                <MenuItem value="ADMIN">Admin</MenuItem>
                <MenuItem value="STAFF">Staff</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Assign Centers</InputLabel>
                <Select
                  multiple
                  value={form.centerIds}
                  onChange={(e) => setForm((f) => ({ ...f, centerIds: e.target.value as string[] }))}
                  input={<OutlinedInput label="Assign Centers" />}
                  renderValue={(selected) =>
                    centers
                      .filter((c) => selected.includes(c.id))
                      .map((c) => c.centerCode)
                      .join(', ')
                  }
                >
                  {centers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      <Checkbox checked={form.centerIds.includes(c.id)} />
                      <ListItemText primary={`${c.centerName} (${c.centerCode})`} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting || passwordMismatch}>
            {submitting ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete User</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this user? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="outlined" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Configure Centers Dialog */}
      <Dialog open={!!centerDialogUser} onClose={() => setCenterDialogUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Configure Centers
          {centerDialogUser && (
            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 400, mt: 0.25 }}>
              Assigning branches for <strong>{centerDialogUser.username}</strong>
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {centers.map((c) => {
              const checked = centerDialogIds.includes(c.id);
              return (
                <Box
                  key={c.id}
                  onClick={() =>
                    setCenterDialogIds((ids) =>
                      checked ? ids.filter((id) => id !== c.id) : [...ids, c.id]
                    )
                  }
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: checked ? '#006b5e' : '#e2e8f0',
                    backgroundColor: checked ? 'rgba(0,107,94,0.05)' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    '&:hover': { borderColor: '#006b5e', backgroundColor: 'rgba(0,107,94,0.04)' },
                  }}
                >
                  <Checkbox
                    checked={checked}
                    size="small"
                    sx={{ p: 0, color: '#006b5e', '&.Mui-checked': { color: '#006b5e' } }}
                    onChange={() => {}}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                      {c.centerName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {c.centerCode}
                    </Typography>
                  </Box>
                  {checked && (
                    <Chip label="Assigned" size="small" sx={{ backgroundColor: 'rgba(0,107,94,0.12)', color: '#006b5e', fontWeight: 600, fontSize: '0.65rem' }} />
                  )}
                </Box>
              );
            })}
            {centers.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No centers available. Create centers first.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Typography variant="caption" sx={{ flex: 1, color: '#64748b' }}>
            {centerDialogIds.length} center{centerDialogIds.length !== 1 ? 's' : ''} selected
          </Typography>
          <Button variant="outlined" onClick={() => setCenterDialogUser(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCenterSave}
            disabled={centerSaving}
            sx={{ color: '#fff', background: 'linear-gradient(135deg, #000666 0%, #006b5e 100%)' }}
          >
            {centerSaving ? 'Saving...' : 'Save'}
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
