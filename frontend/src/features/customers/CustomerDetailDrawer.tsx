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
