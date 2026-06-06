import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Avatar,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
  Button,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon,
  PendingActions as PendingIcon,
  CheckCircleOutline as ApprovedIcon,
  WarningAmber as WarningIcon,
  FilterList as FilterIcon,
  DateRange as DateRangeIcon,
  Assessment as ReportIcon,
  Receipt as ReceiptIcon,
  MoneyOff as ExpenseIcon,
} from '@mui/icons-material';
import { startOfMonth, subDays, subMonths, format as fmtDate } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar,
} from 'recharts';
import { format } from 'date-fns';
import type { Center } from '../../types';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { apiClient } from '../../utils/apiClient';
import type { CenterPerformance, ExpenseBreakdown } from '../../types';
import { formatPaymentMode } from '../../utils/paymentModes';

const DONUT_COLORS = ['#000666', '#006b5e', '#1a237e', '#3d9b8f', '#283593', '#4db6ac'];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const formatShort = (val: number) => {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
};

// ------ Stat Card ------
interface StatCardProps {
  period: string;
  label: string;
  value: number;
  accentColor: string;
  icon: React.ReactNode;
  loading?: boolean;
  trend?: 'up' | 'down' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ period, label, value, accentColor, icon, loading, trend }) => (
  <Card
    sx={{
      borderRadius: '14px',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      border: 'none',
      overflow: 'hidden',
      position: 'relative',
      height: '100%',
      '&::after': {
        content: '""',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: accentColor,
      },
    }}
  >
    <CardContent sx={{ p: 2.5, pb: '16px !important' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: '10px',
            backgroundColor: `${accentColor}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accentColor,
          }}
        >
          {icon}
        </Box>
        {trend && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.3,
              backgroundColor: trend === 'up' ? 'rgba(0,107,94,0.1)' : trend === 'down' ? 'rgba(186,26,26,0.1)' : '#f1f5f9',
              borderRadius: '6px',
              px: 0.8,
              py: 0.3,
            }}
          >
            {trend === 'up' ? (
              <TrendingUpIcon sx={{ fontSize: 13, color: '#006b5e' }} />
            ) : (
              <TrendingDownIcon sx={{ fontSize: 13, color: '#ba1a1a' }} />
            )}
          </Box>
        )}
      </Box>

      <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {period}
      </Typography>
      <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600, fontSize: '0.82rem', mb: 0.5 }}>
        {label}
      </Typography>
      {loading ? (
        <Skeleton variant="text" width={90} height={32} />
      ) : (
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '1.15rem', lineHeight: 1.2 }}>
          {formatCurrency(value)}
        </Typography>
      )}
    </CardContent>
  </Card>
);

// ------ Pending Approvals dark card ------
interface PendingCardProps {
  pending: number;
  approved: number;
  loading?: boolean;
}

const PendingApprovalsCard: React.FC<PendingCardProps> = ({ pending, approved, loading }) => (
  <Card
    sx={{
      borderRadius: '14px',
      background: 'linear-gradient(160deg, #000666 0%, #1a237e 60%, #006b5e 100%)',
      border: 'none',
      height: '100%',
      color: '#fff',
      overflow: 'hidden',
      position: 'relative',
    }}
  >
    <Box
      sx={{
        position: 'absolute',
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.05)',
      }}
    />
    <Box
      sx={{
        position: 'absolute',
        bottom: -20,
        left: -20,
        width: 80,
        height: 80,
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.04)',
      }}
    />
    <CardContent sx={{ p: 2.5, position: 'relative', zIndex: 1 }}>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Workflow Status
      </Typography>
      <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2, mt: 0.5 }}>
        Pending Approvals
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
            p: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PendingIcon sx={{ fontSize: 18, color: '#fbbf24' }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              Awaiting Review
            </Typography>
          </Box>
          {loading ? (
            <Skeleton variant="text" width={30} sx={{ bgcolor: 'rgba(255,255,255,0.15)' }} />
          ) : (
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
              {pending}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
            p: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ApprovedIcon sx={{ fontSize: 18, color: '#94f0df' }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              Approved Today
            </Typography>
          </Box>
          {loading ? (
            <Skeleton variant="text" width={30} sx={{ bgcolor: 'rgba(255,255,255,0.15)' }} />
          ) : (
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
              {approved}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
            p: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon sx={{ fontSize: 18, color: '#fca5a5' }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              Needs Action
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
            {pending > 0 ? pending : 0}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ------ Helpers ------
type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | 'thisMonth' | '3m' | 'custom';

// Backend uses subDays(today, days) as startDate — so days:0 = today only, days:6 = last 7 days, etc.
function presetToDates(preset: DatePreset, customFrom: string, customTo: string): { startDate: string; endDate: string; days: number } {
  const now = new Date();
  const today = fmtDate(now, 'yyyy-MM-dd');
  const yesterday = fmtDate(subDays(now, 1), 'yyyy-MM-dd');
  switch (preset) {
    case 'today':     return { startDate: today, endDate: today, days: 0 };
    case 'yesterday': return { startDate: yesterday, endDate: yesterday, days: 1 };
    case '7d':        return { startDate: fmtDate(subDays(now, 6), 'yyyy-MM-dd'), endDate: today, days: 6 };
    case '30d':       return { startDate: fmtDate(subDays(now, 29), 'yyyy-MM-dd'), endDate: today, days: 29 };
    case 'thisMonth': { const som = startOfMonth(now); return { startDate: fmtDate(som, 'yyyy-MM-dd'), endDate: today, days: Math.ceil((now.getTime() - som.getTime()) / 86400000) }; }
    case '3m':        return { startDate: fmtDate(subMonths(now, 3), 'yyyy-MM-dd'), endDate: today, days: 90 };
    case 'custom':    return { startDate: customFrom || fmtDate(subDays(now, 29), 'yyyy-MM-dd'), endDate: customTo || today, days: 29 };
    default:          return { startDate: fmtDate(subDays(now, 29), 'yyyy-MM-dd'), endDate: today, days: 29 };
  }
}

const PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  thisMonth: 'This Month',
  '3m': 'Last 3 Months',
  custom: 'Custom Period',
};

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today',     label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d',        label: 'Last 7D' },
  { value: '30d',       label: 'Last 30D' },
  { value: 'thisMonth', label: 'This Month' },
  { value: '3m',        label: '3 Months' },
  { value: 'custom',    label: 'Custom' },
];

// ------ Main component ------
interface TrendPoint {
  date: string;
  income: number;
  expenses: number;
}

export const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === 'ADMIN';

  // Filter state
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [centerId, setCenterId] = useState('');
  const [allCenters, setAllCenters] = useState<Center[]>([]);

  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [centerPerf, setCenterPerf] = useState<CenterPerformance[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdown[]>([]);
  const [paymentModeData, setPaymentModeData] = useState<{ paymentMode: string; totalAmount: number; count: number }[]>([]);
  const [hourly, setHourly] = useState<{ label: string; count: number; totalAmount: number }[]>([]);
  const [recentTx, setRecentTx] = useState<Record<string, unknown>[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [settlementTotals, setSettlementTotals] = useState<
    { centerId: string; centerName: string; totalRemainingDues: number; totalCarryForward: number }[]
  >([]);
  const [totalsLoading, setTotalsLoading] = useState(false);

  // Fetch centers list for admin filter
  useEffect(() => {
    if (isAdmin) {
      apiClient.get('/admin/centers').then((res) => {
        const d = res.data?.data?.data || res.data?.data || [];
        setAllCenters(Array.isArray(d) ? d : []);
      }).catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    setTotalsLoading(true);
    const params: Record<string, unknown> = {};
    if (centerId) params.centerId = centerId;
    apiClient.get('/dashboard/settlement-totals', { params })
      .then((res) => setSettlementTotals(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch(() => setSettlementTotals([]))
      .finally(() => setTotalsLoading(false));
  }, [centerId, isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    const { startDate, endDate, days } = presetToDates(datePreset, customFrom, customTo);
    const centerParam = centerId ? { centerId } : {};
    try {
        const [trendRes, perfRes, breakdownRes, paymentRes, hourlyRes, txRes, editRes] = await Promise.allSettled([
          apiClient.get('/dashboard/income-vs-expense-trend', { params: { startDate, endDate, days, ...centerParam } }),
          apiClient.get('/dashboard/center-performance', { params: { startDate, endDate, days } }),
          apiClient.get('/dashboard/expense-breakdown', { params: { startDate, endDate, days, ...centerParam } }),
          apiClient.get('/dashboard/payment-mode-breakdown', { params: { startDate, endDate, days, ...centerParam } }),
          apiClient.get('/dashboard/hourly-distribution', { params: { startDate, endDate, days, ...centerParam } }),
          apiClient.get('/transactions', { params: { limit: 5, page: 1, ...centerParam } }),
          apiClient.get('/edit-requests', { params: { limit: 1, status: 'PENDING' } }),
        ]);

        if (trendRes.status === 'fulfilled') {
          const d = trendRes.value.data?.data || trendRes.value.data;
          if (d && typeof d === 'object' && !Array.isArray(d)) {
            // Merge income/expenses arrays by date
            const incomeArr: { date: string; total: number }[] = d.income || [];
            const expArr: { date: string; total: number }[] = d.expenses || [];
            const dateSet = new Set([...incomeArr.map((x) => x.date), ...expArr.map((x) => x.date)]);
            const merged = Array.from(dateSet)
              .sort()
              .map((date) => ({
                date,
                income: incomeArr.find((x) => x.date === date)?.total ?? 0,
                expenses: expArr.find((x) => x.date === date)?.total ?? 0,
              }));
            setTrendData(merged);
          } else if (Array.isArray(d)) {
            setTrendData(d);
          }
        }

        if (perfRes.status === 'fulfilled') {
          const d = perfRes.value.data?.data || perfRes.value.data;
          setCenterPerf(Array.isArray(d) ? d : []);
        }

        if (breakdownRes.status === 'fulfilled') {
          const d = breakdownRes.value.data?.data || breakdownRes.value.data;
          setExpenseBreakdown(Array.isArray(d) ? d : []);
        }

        if (paymentRes.status === 'fulfilled') {
          const d = paymentRes.value.data?.data || paymentRes.value.data;
          setPaymentModeData(Array.isArray(d) ? d : []);
        }

        if (hourlyRes.status === 'fulfilled') {
          const d = hourlyRes.value.data?.data || hourlyRes.value.data;
          setHourly(Array.isArray(d) ? d : []);
        }

        if (txRes.status === 'fulfilled') {
          const d = txRes.value.data?.data?.data || txRes.value.data?.data || [];
          setRecentTx(Array.isArray(d) ? d : []);
        }

        if (editRes.status === 'fulfilled') {
          const d = editRes.value.data?.data;
          setPendingCount(d?.total ?? d?.pagination?.total ?? 0);
        }
      } catch (e) {
        console.error('Dashboard load error', e);
      } finally {
        setLoading(false);
      }
  }, [datePreset, customFrom, customTo, centerId, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  // Period totals — summed from trendData which IS filtered by the selected preset
  const periodIncome   = trendData.reduce((s, d) => s + d.income, 0);
  const periodExpenses = trendData.reduce((s, d) => s + d.expenses, 0);
  // All-time outstanding settlement dues (till now). Center-aware (settlementTotals
  // is fetched with the center filter) but independent of the date preset.
  const allTimeDues    = settlementTotals.reduce((s, c) => s + c.totalRemainingDues, 0);
  const _periodProfit  = periodIncome - periodExpenses; void _periodProfit;
  const periodLabel = datePreset === 'custom' && customFrom && customTo
    ? `${fmtDate(new Date(customFrom), 'd MMM yyyy')} – ${fmtDate(new Date(customTo), 'd MMM yyyy')}`
    : PRESET_LABELS[datePreset];

  const maxCenterIncome = Math.max(...centerPerf.map((c) => c.income ?? 0), 1);

  // Navigate to report page with current dashboard filters pre-applied
  const handleGenerateReport = () => {
    const { startDate, endDate } = presetToDates(datePreset, customFrom, customTo);
    const params = new URLSearchParams({ from: startDate, to: endDate });
    if (centerId) params.set('centerId', centerId);
    navigate(`/reports?${params.toString()}`);
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.25 }}>
            Dashboard Overview
          </Typography>
          <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ReceiptIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate('/transactions/entry')}
            sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.78rem', borderColor: '#000666', color: '#000666', '&:hover': { backgroundColor: 'rgba(0,6,102,0.06)' } }}
          >
            New Transaction
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ExpenseIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate('/expenses')}
            sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.78rem', borderColor: '#006b5e', color: '#006b5e', '&:hover': { backgroundColor: 'rgba(0,107,94,0.06)' } }}
          >
            New Expense
          </Button>
          <Chip
            label={`Welcome, ${user?.username}`}
            size="small"
            sx={{ backgroundColor: 'rgba(0,6,102,0.08)', color: '#000666', fontWeight: 600, fontSize: '0.75rem', borderRadius: '8px' }}
          />
        </Box>
      </Box>

      {/* ── Filter Bar ── */}
      <Card sx={{ borderRadius: '14px', mb: 2.5 }}>
        <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, flexWrap: 'wrap', gap: 2 }}>
            {/* Label */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
              <FilterIcon sx={{ fontSize: 17, color: '#000666' }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#000666', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Filters
              </Typography>
            </Box>

            {/* Date preset — dropdown on mobile, toggle buttons on desktop */}
            {isMobile ? (
              <TextField
                select size="small" value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                label="Date Range"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.82rem' } }}
              >
                {DATE_PRESETS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
              </TextField>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DateRangeIcon sx={{ fontSize: 16, color: '#475569' }} />
                <ToggleButtonGroup
                  value={datePreset}
                  exclusive
                  onChange={(_, v) => { if (v) setDatePreset(v as DatePreset); }}
                  size="small"
                  sx={{ '& .MuiToggleButtonGroup-grouped': { border: '1.5px solid #e2e8f0 !important', borderRadius: '8px !important', mx: '2px !important', px: 1.5, py: 0.4 } }}
                >
                  {DATE_PRESETS.map((p) => (
                    <ToggleButton key={p.value} value={p.value}
                      sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'none', color: '#334155', '&.Mui-selected': { backgroundColor: 'rgba(0,6,102,0.09)', color: '#000666', borderColor: '#000666 !important' } }}>
                      {p.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
            )}

            {/* Center filter — admin only */}
            {isAdmin && (
              <TextField
                select size="small" value={centerId}
                onChange={(e) => setCenterId(e.target.value)}
                label="Center"
                sx={{ minWidth: { xs: 0, sm: 170 }, '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.82rem' } }}
              >
                <MenuItem value="">All Centers</MenuItem>
                {allCenters.map((c) => <MenuItem key={c.id} value={c.id}>{c.centerName}</MenuItem>)}
              </TextField>
            )}

            {/* Generate Report button */}
            <Box sx={{ ml: { xs: 0, sm: 'auto' } }}>
              <Button
                size="small" variant="contained" fullWidth={isMobile}
                startIcon={<ReportIcon sx={{ fontSize: 16 }} />}
                onClick={handleGenerateReport}
                sx={{ borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem', background: 'linear-gradient(135deg, #000666 0%, #006b5e 100%)', boxShadow: '0 2px 8px rgba(0,6,102,0.2)', whiteSpace: 'nowrap', '&:hover': { background: 'linear-gradient(135deg, #1a237e 0%, #006b5e 100%)' } }}
              >
                Generate Report
              </Button>
            </Box>
          </Box>

          {/* Custom date range row */}
          <Collapse in={datePreset === 'custom'}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                type="date"
                label="From Date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.82rem' } }}
              />
              <TextField
                size="small"
                type="date"
                label="To Date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.82rem' } }}
              />
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500, fontSize: '0.75rem' }}>
                Charts update automatically
              </Typography>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* ── Period Summary Cards (driven by selected filter) ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sx={{ pb: 0 }}>
          <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {periodLabel}
          </Typography>
        </Grid>
        <Grid item xs={6} sm={4}>
          <StatCard
            period={periodLabel}
            label="Total Income"
            value={periodIncome}
            accentColor="#000666"
            icon={<TrendingUpIcon sx={{ fontSize: 20 }} />}
            loading={loading}
            trend={periodIncome > 0 ? 'up' : 'neutral'}
          />
        </Grid>
        <Grid item xs={6} sm={4}>
          <StatCard
            period={periodLabel}
            label="Total Expenses"
            value={periodExpenses}
            accentColor="#ba1a1a"
            icon={<TrendingDownIcon sx={{ fontSize: 20 }} />}
            loading={loading}
            trend={periodExpenses > 0 ? 'down' : 'neutral'}
          />
        </Grid>
        <Grid item xs={6} sm={4}>
          <StatCard
            period="Till Now"
            label="Settlement Dues"
            value={allTimeDues}
            accentColor="#f59e0b"
            icon={<AccountBalanceIcon sx={{ fontSize: 20 }} />}
            loading={totalsLoading}
            trend="neutral"
          />
        </Grid>

      </Grid>

      {/* ── Payment Mode Bar Chart ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
      <Card sx={{ borderRadius: '14px' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.25 }}>
                Payment Mode Breakdown
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500, fontSize: '0.75rem' }}>
                How income was received — {periodLabel.toLowerCase()}
              </Typography>
            </Box>
          </Box>
          {loading ? (
            <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
          ) : paymentModeData.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220 }}>
              <Typography variant="body2" color="text.secondary">No transaction data for this period</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {/* Payment mode mini cards — 2 rows × 3 cols */}
              <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, alignContent: 'center' }}>
                {paymentModeData.map((d, idx) => (
                  <Box
                    key={d.paymentMode}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.25,
                      px: 1.25,
                      py: 1,
                      borderRadius: '10px',
                      bgcolor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: DONUT_COLORS[idx % DONUT_COLORS.length], flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155', textTransform: 'capitalize', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {formatPaymentMode(d.paymentMode)}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                      {formatCurrency(d.totalAmount)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: '#64748b', lineHeight: 1.2 }}>
                      {d.count} txn{d.count !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                ))}
              </Box>
              {/* Donut chart */}
              <Box sx={{ width: 180, flexShrink: 0 }}>
                <ResponsiveContainer width={180} height={220}>
                  <PieChart>
                    <Pie
                      data={paymentModeData.map((d) => ({ ...d, name: formatPaymentMode(d.paymentMode) }))}
                      dataKey="totalAmount"
                      nameKey="name"
                      cx="50%"
                      cy="42%"
                      outerRadius={62}
                      innerRadius={36}
                      paddingAngle={3}
                    >
                      {paymentModeData.map((_, idx) => (
                        <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '0.65rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
        </Grid>

        {/* ── Expense Split Donut (same row as Payment Mode) ── */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: '14px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.25 }}>
                Expense Split
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500, fontSize: '0.75rem' }}>
                By category
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                {loading ? (
                  <Skeleton variant="circular" width={120} height={120} sx={{ mx: 'auto', mt: 2 }} />
                ) : expenseBreakdown.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220 }}>
                    <Typography variant="body2" color="text.secondary">No data</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={expenseBreakdown.map((d) => ({ ...d, name: d.category?.categoryName ?? '—', totalAmount: Number(d.totalAmount) }))}
                        dataKey="totalAmount"
                        nameKey="name"
                        cx="50%"
                        cy="42%"
                        outerRadius={70}
                        innerRadius={42}
                        paddingAngle={3}
                      >
                        {expenseBreakdown.map((_, idx) => (
                          <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '0.7rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Transaction Rush by 3-hour slot ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12}>
          <Card sx={{ borderRadius: '14px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.25 }}>
                Transaction Rush — by 3-hour slot
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500, fontSize: '0.75rem' }}>
                Transactions per time slot — {periodLabel.toLowerCase()}
              </Typography>
              <Box sx={{ mt: 1.5 }}>
                {loading ? (
                  <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
                ) : hourly.every((h) => h.count === 0) ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
                    <Typography variant="body2" color="text.secondary">No transactions in this period</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={hourly} margin={{ top: 8, right: 8, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <RechartsTooltip
                        cursor={{ fill: 'rgba(0,6,102,0.04)' }}
                        contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }}
                        formatter={(value, _name, item) => [
                          `${value} txns · ${formatCurrency(Number(item?.payload?.totalAmount ?? 0))}`,
                          'Rush',
                        ]}
                      />
                      <Bar dataKey="count" fill="#000666" radius={[6, 6, 0, 0]} maxBarSize={52} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Bento Row 1: Income vs Expense chart + Pending Approvals ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Income vs Expense Line Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: '14px', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.25 }}>
                    Income vs Expenses
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500, fontSize: '0.75rem' }}>
                    Daily trend — {periodLabel.toLowerCase()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {[{ label: 'Income', color: '#000666' }, { label: 'Expenses', color: '#ba1a1a' }].map((l) => (
                    <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: l.color }} />
                      <Typography variant="caption" sx={{ color: '#334155', fontWeight: 500, fontSize: '0.75rem' }}>{l.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box sx={{ height: 220, mt: 1 }}>
                {loading ? (
                  <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
                ) : trendData.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography variant="body2" color="text.secondary">No trend data yet</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                      <defs>
                        <linearGradient id="incomeArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#000666" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#000666" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ba1a1a" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#ba1a1a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) => { try { return format(new Date(v), 'MMM d'); } catch { return v; } }}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => formatShort(v)}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        width={52}
                      />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Line type="monotone" dataKey="income" stroke="#000666" strokeWidth={2.5} dot={{ r: 3, fill: '#000666' }} activeDot={{ r: 5 }} name="Income" />
                      <Line type="monotone" dataKey="expenses" stroke="#ba1a1a" strokeWidth={2.5} dot={{ r: 3, fill: '#ba1a1a' }} activeDot={{ r: 5 }} name="Expenses" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Approvals dark card */}
        <Grid item xs={12} md={4}>
          <PendingApprovalsCard pending={pendingCount} approved={0} loading={loading} />
        </Grid>
      </Grid>

      {/* ── Bento Row 2: Center Performance + Profit/Loss area ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Center Performance */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: '14px', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.25 }}>
                Center Performance
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500, fontSize: '0.75rem' }}>
                Income — {periodLabel.toLowerCase()}
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <Box key={i}>
                        <Skeleton variant="text" width="60%" height={16} />
                        <Skeleton variant="rectangular" height={6} sx={{ borderRadius: 9999, mt: 0.5 }} />
                      </Box>
                    ))
                  : centerPerf.length === 0
                  ? (
                    <Typography variant="body2" color="text.secondary">No centers data</Typography>
                  )
                  : centerPerf.map((c, i) => {
                      const pct = Math.round(((c.income ?? 0) / maxCenterIncome) * 100);
                      const barColors = ['#000666', '#006b5e', '#1a237e', '#3d9b8f'];
                      return (
                        <Box key={c.center?.id ?? i}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.78rem' }}>
                              {c.center?.centerName ?? `Center ${i + 1}`}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#334155', fontWeight: 600, fontSize: '0.78rem' }}>
                              {formatCurrency(c.income ?? 0)}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              height: 6,
                              borderRadius: 9999,
                              backgroundColor: '#f1f5f9',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 9999,
                                backgroundColor: barColors[i % barColors.length],
                              },
                            }}
                          />
                        </Box>
                      );
                    })}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Profit/Loss Area Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: '14px', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.25 }}>
                Profit / Loss Trend
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500, fontSize: '0.75rem' }}>
                Net profit — {periodLabel.toLowerCase()}
              </Typography>
              <Box sx={{ height: 180, mt: 1.5 }}>
                {loading ? (
                  <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
                ) : trendData.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography variant="body2" color="text.secondary">No data</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData.map((d) => ({ ...d, profit: d.income - d.expenses }))} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                      <defs>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#006b5e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#006b5e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) => { try { return format(new Date(v), 'MMM d'); } catch { return v; } }}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={46} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Area type="monotone" dataKey="profit" stroke="#006b5e" strokeWidth={2.5} fill="url(#profitGrad)" name="Profit" dot={{ r: 3, fill: '#006b5e' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

      </Grid>


      {/* ── Recent Transactions Table ── */}
      <Card sx={{ borderRadius: '14px' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                Recent Transactions
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500, fontSize: '0.75rem' }}>
                Latest 5 entries
              </Typography>
            </Box>
          </Box>
          {isMobile ? (
            /* Mobile: card list */
            loading ? (
              <Stack divider={<Divider />}>
                {Array.from({ length: 5 }).map((_, i) => <Box key={i} sx={{ py: 1.5 }}><Skeleton variant="text" width="60%" /><Skeleton variant="text" width="40%" /></Box>)}
              </Stack>
            ) : recentTx.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">No recent transactions</Typography></Box>
            ) : (
              <Stack divider={<Divider />}>
                {recentTx.map((tx: Record<string, unknown>) => (
                  <Box key={tx.id as string} sx={{ py: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.25 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#000666', fontSize: '0.78rem' }}>{tx.transactionNumber as string}</Typography>
                      <Chip label={tx.isLocked ? 'Locked' : 'Active'} size="small" sx={{ backgroundColor: tx.isLocked ? 'rgba(100,116,139,0.1)' : 'rgba(0,107,94,0.1)', color: tx.isLocked ? '#64748b' : '#006b5e', fontWeight: 600, fontSize: '0.68rem', borderRadius: '6px' }} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{tx.vehicleNumber as string}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">{(tx.incomeSource as Record<string, unknown>)?.sourceName as string}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#006b5e' }}>{formatCurrency(Number(tx.amount))}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )
          ) : (
            /* Desktop: table */
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Transaction No.</TableCell>
                    <TableCell>Vehicle</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>
                      ))
                    : recentTx.length === 0
                    ? (
                      <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><Typography variant="body2" color="text.secondary">No recent transactions</Typography></TableCell></TableRow>
                    )
                    : recentTx.map((tx: Record<string, unknown>) => (
                        <TableRow key={tx.id as string} hover>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: '#000666' }}>{tx.transactionNumber as string}</Typography></TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 28, height: 28, backgroundColor: 'rgba(0,6,102,0.08)', color: '#000666', fontSize: '0.7rem', fontWeight: 700 }}>
                                {(tx.vehicleNumber as string)?.[0] ?? 'V'}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>{tx.vehicleNumber as string}</Typography>
                                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500, fontSize: '0.75rem' }}>{(tx.vehicleType as Record<string, unknown>)?.typeName as string}</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell><Typography variant="body2" sx={{ color: '#475569' }}>{(tx.incomeSource as Record<string, unknown>)?.sourceName as string}</Typography></TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 700, color: '#006b5e' }}>{formatCurrency(Number(tx.amount))}</Typography></TableCell>
                          <TableCell><Typography variant="body2" sx={{ color: '#334155', fontWeight: 500 }}>{tx.transactionDate ? (() => { try { return format(new Date(tx.transactionDate as string), 'MMM d, yyyy'); } catch { return tx.transactionDate as string; } })() : '—'}</Typography></TableCell>
                          <TableCell><Chip label={tx.isLocked ? 'Locked' : 'Active'} size="small" sx={{ backgroundColor: tx.isLocked ? 'rgba(100,116,139,0.1)' : 'rgba(0,107,94,0.1)', color: tx.isLocked ? '#64748b' : '#006b5e', fontWeight: 600, fontSize: '0.68rem', borderRadius: '6px' }} /></TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

    </Box>
  );
};
