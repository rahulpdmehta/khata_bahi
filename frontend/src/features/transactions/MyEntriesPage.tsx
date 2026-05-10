import React, { useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  Grid,
  Avatar,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  AttachMoney as MoneyIcon,
  Numbers as CountIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchMyEntries } from './transactionSlice';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

export const MyEntriesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { myEntries, loading } = useAppSelector((state) => state.transactions);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    dispatch(fetchMyEntries({ date: today }));
  }, [dispatch, today]);

  const totalAmount = myEntries.reduce((sum, t) => sum + t.amount, 0);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
          My Entries Today
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#fff',
              border: 'none',
              boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 500 }}>
                    Total Transactions
                  </Typography>
                  {loading ? (
                    <Skeleton variant="text" width={80} height={44} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                  ) : (
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {myEntries.length}
                    </Typography>
                  )}
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                  <CountIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              boxShadow: '0 8px 32px rgba(16,185,129,0.3)',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 500 }}>
                    Total Amount
                  </Typography>
                  {loading ? (
                    <Skeleton variant="text" width={140} height={44} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                  ) : (
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {formatCurrency(totalAmount)}
                    </Typography>
                  )}
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                  <MoneyIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Entries Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon sx={{ color: '#6366f1' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Today's Entries
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Transaction No</TableCell>
                  <TableCell>Vehicle Number</TableCell>
                  <TableCell>Vehicle Type</TableCell>
                  <TableCell>Income Source</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}><Skeleton variant="text" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : myEntries.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <ReceiptIcon sx={{ fontSize: 48, color: '#e2e8f0' }} />
                          <Typography color="text.secondary">No entries today yet</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Start recording transactions to see them here
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                  : myEntries.map((tx, idx) => (
                      <TableRow key={tx.id} hover>
                        <TableCell sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>{idx + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#6366f1' }}>
                            {tx.transactionNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {tx.vehicleNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={tx.vehicleType?.typeCode || '—'}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(99,102,241,0.1)',
                              color: '#6366f1',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                        </TableCell>
                        <TableCell>{tx.incomeSource?.sourceName || '—'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(tx.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {tx.transactionTime || '—'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={tx.isLocked ? 'Locked' : 'Active'}
                            size="small"
                            sx={{
                              backgroundColor: tx.isLocked ? 'rgba(100,116,139,0.12)' : 'rgba(16,185,129,0.12)',
                              color: tx.isLocked ? '#64748b' : '#10b981',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};
