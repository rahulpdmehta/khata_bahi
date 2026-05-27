import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Skeleton,
  Snackbar,
  Alert,
  TextField,
  Grid,
  Paper,
  Divider,
  MenuItem,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  EditNote as EditNoteIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchEditRequests, approveEditRequest, rejectEditRequest } from './editRequestSlice';
import type { EditRequest } from '../../types';

const statusConfig: Record<EditRequest['status'], { label: string; bg: string; color: string }> = {
  PENDING:  { label: 'Pending',  bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  APPROVED: { label: 'Approved', bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  REJECTED: { label: 'Rejected', bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
};

const resourceLabel = (req: EditRequest) => {
  if (req.resourceType === 'EXPENSE')     return req.expense?.expenseNumber    || req.expenseId    || '—';
  if (req.resourceType === 'SETTLEMENT')  return req.settlement?.settlementNumber || req.settlementId || '—';
  return req.transaction?.transactionNumber || req.transactionId || '—';
};

const resourceSub = (req: EditRequest) => {
  if (req.resourceType === 'EXPENSE')    return req.expense?.vendorName    || '';
  if (req.resourceType === 'SETTLEMENT') return req.settlement?.center?.centerName || '';
  return req.transaction?.vehicleNumber || '';
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

export const EditRequestsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { editRequests, loading } = useAppSelector((state) => state.editRequests);
  const isAdmin = user?.role === 'ADMIN';

  const [tab, setTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [reviewTarget, setReviewTarget] = useState<EditRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState<'approve' | 'reject' | null>(null);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    dispatch(fetchEditRequests({}));
  }, [dispatch]);

  const myRequests      = editRequests.filter((r) => r.requestedBy === user?.id);
  const pendingRequests = editRequests.filter((r) => r.status === 'PENDING');
  const allFiltered     = statusFilter ? editRequests.filter((r) => r.status === statusFilter) : editRequests;

  const handleApprove = async () => {
    if (!reviewTarget) return;
    setReviewing('approve');
    try {
      await dispatch(approveEditRequest({ id: reviewTarget.id, reviewNotes })).unwrap();
      setSnack({ open: true, msg: 'Edit request approved!', severity: 'success' });
      setReviewTarget(null);
      setReviewNotes('');
    } catch {
      setSnack({ open: true, msg: 'Failed to approve.', severity: 'error' });
    } finally {
      setReviewing(null);
    }
  };

  const handleReject = async () => {
    if (!reviewTarget || !reviewNotes) return;
    setReviewing('reject');
    try {
      await dispatch(rejectEditRequest({ id: reviewTarget.id, reviewNotes })).unwrap();
      setSnack({ open: true, msg: 'Edit request rejected.', severity: 'success' });
      setReviewTarget(null);
      setReviewNotes('');
    } catch {
      setSnack({ open: true, msg: 'Failed to reject.', severity: 'error' });
    } finally {
      setReviewing(null);
    }
  };

  const openReview = (req: EditRequest) => { setReviewTarget(req); setReviewNotes(''); };

  const RowActions = ({ req }: { req: EditRequest }) => (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Tooltip title="View details"><IconButton size="small" onClick={() => openReview(req)} sx={{ color: '#6366f1' }}><InfoIcon fontSize="small" /></IconButton></Tooltip>
      {isAdmin && req.status === 'PENDING' && (
        <>
          <Tooltip title="Approve"><IconButton size="small" onClick={() => openReview(req)} sx={{ color: '#10b981' }}><ApproveIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Reject"><IconButton size="small" onClick={() => openReview(req)} sx={{ color: '#ef4444' }}><RejectIcon fontSize="small" /></IconButton></Tooltip>
        </>
      )}
    </Box>
  );

  const RequestTable = ({ rows, showStatus = true }: { rows: EditRequest[]; showStatus?: boolean }) => (
    isMobile ? (
      loading ? (
        <Stack divider={<Divider />}>
          {Array.from({ length: 4 }).map((_, i) => <Box key={i} sx={{ p: 2 }}><Skeleton variant="text" width="60%" /><Skeleton variant="text" width="80%" /></Box>)}
        </Stack>
      ) : rows.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <EditNoteIcon sx={{ fontSize: 40, color: '#e2e8f0' }} />
          <Typography color="text.secondary">No edit requests found</Typography>
        </Box>
      ) : (
        <Stack divider={<Divider />}>
          {rows.map((req) => {
            const sc = statusConfig[req.status];
            return (
              <Box key={req.id} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#6366f1', fontSize: '0.78rem' }}>{resourceLabel(req)}</Typography>
                    {resourceSub(req) && <Typography variant="caption" color="text.secondary">{resourceSub(req)}</Typography>}
                    {req.resourceType === 'SETTLEMENT' && req.settlement?.finalAmount != null && (
                      <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, display: 'block' }}>
                        {formatCurrency(Number(req.settlement.finalAmount))}
                      </Typography>
                    )}
                  </Box>
                  {showStatus && <Chip label={sc.label} size="small" sx={{ backgroundColor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.68rem' }} />}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 0.5 }}>
                  <Chip label={req.resourceType} size="small" sx={{ fontSize: '0.65rem', fontWeight: 600, backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1' }} />
                  <Typography variant="caption" color="text.secondary">{req.requester?.username || req.requestedBy}</Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#475569', mb: 0.5, fontSize: '0.8rem' }} noWrap>{req.requestReason}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {(() => { try { return format(new Date(req.requestedAt), 'MMM d, yyyy'); } catch { return req.requestedAt; } })()}
                  </Typography>
                  <RowActions req={req} />
                </Box>
              </Box>
            );
          })}
        </Stack>
      )
    ) : (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' } }}>
              <TableCell>Resource</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Requested By</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Date</TableCell>
              {showStatus && <TableCell>Status</TableCell>}
              {showStatus && isAdmin && <TableCell>Reviewed By</TableCell>}
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>
                ))
              : rows.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <EditNoteIcon sx={{ fontSize: 48, color: '#e2e8f0' }} />
                      <Typography color="text.secondary">No edit requests found</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )
              : rows.map((req) => {
                  const sc = statusConfig[req.status];
                  return (
                    <TableRow key={req.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#6366f1' }}>{resourceLabel(req)}</Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>{resourceSub(req)}</Typography>
                        {req.resourceType === 'SETTLEMENT' && req.settlement?.finalAmount != null && (
                          <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, display: 'block' }}>
                            {formatCurrency(Number(req.settlement.finalAmount))}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell><Chip label={req.resourceType} size="small" sx={{ fontSize: '0.65rem', fontWeight: 600, backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1' }} /></TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{req.requester?.username || req.requestedBy}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ maxWidth: 180 }} noWrap title={req.requestReason}>{req.requestReason}</Typography></TableCell>
                      <TableCell>
                        <Typography variant="body2">{(() => { try { return format(new Date(req.requestedAt), 'MMM d, yyyy'); } catch { return req.requestedAt; } })()}</Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>{(() => { try { return format(new Date(req.requestedAt), 'hh:mm a'); } catch { return ''; } })()}</Typography>
                      </TableCell>
                      {showStatus && <TableCell><Chip label={sc.label} size="small" sx={{ backgroundColor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.7rem' }} /></TableCell>}
                      {showStatus && isAdmin && (
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>{req.reviewer?.username || (req.status === 'PENDING' ? '—' : req.reviewedBy || '—')}</Typography>
                          {req.reviewNotes && <Typography variant="caption" sx={{ color: '#94a3b8' }} noWrap title={req.reviewNotes}>{req.reviewNotes}</Typography>}
                        </TableCell>
                      )}
                      <TableCell align="center"><RowActions req={req} /></TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </TableContainer>
    )
  );

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
          Edit Requests
        </Typography>
        <Typography variant="body2" sx={{ color: '#475569' }}>
          {isAdmin ? 'Review and manage all edit requests' : 'Track your submitted edit requests'}
        </Typography>
      </Box>

      <Card>
        <Box sx={{ borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
          <Tabs value={tab} onChange={(_, v) => { setTab(v); setStatusFilter(''); }} sx={{ px: 3 }}>
            {isAdmin
              ? [
                  <Tab key="all" label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      All Requests
                      <Chip label={editRequests.length} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, backgroundColor: 'rgba(99,102,241,0.12)', color: '#6366f1' }} />
                    </Box>
                  } />,
                  <Tab key="queue" label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Pending Review
                      {pendingRequests.length > 0 && (
                        <Chip label={pendingRequests.length} size="small" color="error" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                      )}
                    </Box>
                  } />,
                ]
              : [<Tab key="mine" label="My Requests" />]
            }
          </Tabs>

          {/* Status filter — only on "All Requests" tab for admin */}
          {isAdmin && tab === 0 && (
            <TextField
              select
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 140 }}
              label="Status"
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
            </TextField>
          )}
        </Box>

        <CardContent sx={{ p: 0 }}>
          {isAdmin
            ? tab === 0
              ? <RequestTable rows={allFiltered} />
              : <RequestTable rows={pendingRequests} showStatus={false} />
            : <RequestTable rows={myRequests} />
          }
        </CardContent>
      </Card>

      {/* Review Modal */}
      {reviewTarget && (
        <Box
          sx={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, p: 2 }}
          onClick={() => setReviewTarget(null)}
        >
          <Card sx={{ maxWidth: 660, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Review Edit Request
                </Typography>
                <Chip
                  label={statusConfig[reviewTarget.status].label}
                  size="small"
                  sx={{ backgroundColor: statusConfig[reviewTarget.status].bg, color: statusConfig[reviewTarget.status].color, fontWeight: 700 }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {reviewTarget.resourceType} · {resourceLabel(reviewTarget)}
                {resourceSub(reviewTarget) && ` · ${resourceSub(reviewTarget)}`}
                {reviewTarget.resourceType === 'SETTLEMENT' && reviewTarget.settlement?.finalAmount != null && (
                  <Typography component="span" variant="caption" sx={{ color: '#10b981', fontWeight: 700, ml: 0.5 }}>
                    · {formatCurrency(Number(reviewTarget.settlement.finalAmount))}
                  </Typography>
                )}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>Requested by</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{reviewTarget.requester?.username || '—'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {(() => { try { return format(new Date(reviewTarget.requestedAt), 'MMM d, yyyy, hh:mm a'); } catch { return reviewTarget.requestedAt; } })()}
                  </Typography>
                </Grid>
                {reviewTarget.reviewer && (
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>Reviewed by</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{reviewTarget.reviewer.username}</Typography>
                  </Grid>
                )}
              </Grid>

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Request Reason</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{reviewTarget.requestReason}</Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: '10px' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', display: 'block', mb: 1 }}>
                      ORIGINAL DATA
                    </Typography>
                    {Object.entries(reviewTarget.originalData || {}).map(([k, v]) => (
                      <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">{k}:</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>{String(v)}</Typography>
                      </Box>
                    ))}
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: '10px', borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.04)' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#6366f1', display: 'block', mb: 1 }}>
                      PROPOSED CHANGES
                    </Typography>
                    {Object.entries(reviewTarget.proposedChanges || {}).map(([k, v]) => (
                      <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">{k}:</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#6366f1' }}>{String(v)}</Typography>
                      </Box>
                    ))}
                  </Paper>
                </Grid>
              </Grid>

              {reviewTarget.reviewNotes && (
                <Box sx={{ mb: 2, p: 1.5, borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', display: 'block', mb: 0.5 }}>REVIEW NOTES</Typography>
                  <Typography variant="body2">{reviewTarget.reviewNotes}</Typography>
                </Box>
              )}

              {isAdmin && reviewTarget.status === 'PENDING' && (
                <>
                  <TextField
                    fullWidth
                    label="Review Notes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    multiline
                    rows={2}
                    placeholder="Add notes for approval or rejection..."
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button variant="outlined" onClick={() => setReviewTarget(null)}>Cancel</Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<RejectIcon />}
                      onClick={handleReject}
                      disabled={!reviewNotes || reviewing === 'reject'}
                      sx={{ color: '#fff' }}
                    >
                      {reviewing === 'reject' ? 'Rejecting...' : 'Reject'}
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<ApproveIcon />}
                      onClick={handleApprove}
                      disabled={reviewing === 'approve'}
                      sx={{ color: '#fff' }}
                    >
                      {reviewing === 'approve' ? 'Approving...' : 'Approve'}
                    </Button>
                  </Box>
                </>
              )}

              {(!isAdmin || reviewTarget.status !== 'PENDING') && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="outlined" onClick={() => setReviewTarget(null)}>Close</Button>
                </Box>
              )}
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
