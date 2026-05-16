import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  InputAdornment,
  ToggleButton,
  Chip,
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  Add as AddIcon,
  Person as PersonIcon,
  Payments as PaymentsIcon,
  CallSplit as SplitIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { createTransaction } from './transactionSlice';
import { fetchIncomeSources, fetchVehicleTypes } from '../masterData/masterDataSlice';
import { fetchCenters } from '../admin/centerSlice';
import { PAYMENT_MODES, type PaymentModeValue } from '../../utils/paymentModes';

interface SplitEntry {
  paymentMode: string;
  amount: string;
}

const emptyForm = (defaultCenterId: string) => ({
  vehicleNumber: '',
  vehicleTypeId: '',
  incomeSourceId: '',
  amount: '',
  centerId: defaultCenterId,
  transactionDate: format(new Date(), 'yyyy-MM-dd'),
  customerName: '',
  customerMobile: '',
  notes: '',
});

/** Auto-fill the other split line when exactly two modes are selected */
function balanceSplitEntries(
  entries: SplitEntry[],
  total: number,
  editedMode?: string
): SplitEntry[] {
  if (entries.length !== 2 || total <= 0) return entries;

  const [first, second] = entries;
  const formatRemainder = (entered: number) => {
    const remainder = Math.max(0, Math.round((total - entered) * 100) / 100);
    return remainder > 0 ? String(remainder) : '';
  };

  if (editedMode === first.paymentMode) {
    const entered = parseFloat(first.amount) || 0;
    return [first, { ...second, amount: formatRemainder(entered) }];
  }
  if (editedMode === second.paymentMode) {
    const entered = parseFloat(second.amount) || 0;
    return [{ ...first, amount: formatRemainder(entered) }, second];
  }

  const firstAmt = parseFloat(first.amount) || 0;
  const secondAmt = parseFloat(second.amount) || 0;
  if (firstAmt > 0 && secondAmt === 0) {
    return [first, { ...second, amount: formatRemainder(firstAmt) }];
  }
  if (secondAmt > 0 && firstAmt === 0) {
    return [{ ...first, amount: formatRemainder(secondAmt) }, second];
  }
  if (firstAmt > 0) {
    return [first, { ...second, amount: formatRemainder(firstAmt) }];
  }
  return entries;
}

export const TransactionEntryPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { incomeSources, vehicleTypes } = useAppSelector((state) => state.masterData);
  const { loading } = useAppSelector((state) => state.transactions);
  const { centers: allCenters } = useAppSelector((state) => state.centers);

  const availableCenters = allCenters.length > 0 ? allCenters : (user?.centers || []);
  const defaultCenterId = availableCenters[0]?.id || '';
  const [form, setForm] = useState(emptyForm(defaultCenterId));
  // splitEntries: one entry per selected payment mode
  const [splitEntries, setSplitEntries] = useState<SplitEntry[]>([{ paymentMode: 'CASH', amount: '' }]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const totalAmount = parseFloat(form.amount) || 0;
  const splitTotal = splitEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const splitRemaining = totalAmount - splitTotal;
  const isSplit = splitEntries.length > 1;

  useEffect(() => {
    dispatch(fetchIncomeSources());
    dispatch(fetchVehicleTypes());
    dispatch(fetchCenters());
  }, [dispatch]);

  useEffect(() => {
    if (availableCenters.length > 0 && !form.centerId) {
      setForm((prev) => ({ ...prev, centerId: availableCenters[0].id }));
    }
  }, [availableCenters]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'vehicleTypeId') {
        const vt = vehicleTypes.find((v) => v.id === value);
        if (vt?.baseCharge != null) {
          updated.amount = String(vt.baseCharge);
          setSplitEntries((entries) => {
            const next =
              entries.length === 1
                ? [{ ...entries[0], amount: String(vt.baseCharge) }]
                : entries;
            return balanceSplitEntries(next, Number(vt.baseCharge));
          });
        }
      }
      if (name === 'incomeSourceId') {
        const src = incomeSources.find((s) => s.id === value);
        if (src) {
          updated.amount = String(src.defaultAmount);
          // auto-fill single mode amount
          setSplitEntries((entries) => {
            const amt = Number(src.defaultAmount);
            const next =
              entries.length === 1
                ? [{ ...entries[0], amount: String(amt) }]
                : entries;
            return balanceSplitEntries(next, amt);
          });
        }
      }
      if (name === 'amount') {
        const newTotal = parseFloat(value) || 0;
        if (splitEntries.length === 1) {
          setSplitEntries([{ ...splitEntries[0], amount: value }]);
        } else if (splitEntries.length === 2) {
          setSplitEntries(balanceSplitEntries(splitEntries, newTotal));
        }
      }
      return updated;
    });
  };

  const togglePaymentMode = (mode: string) => {
    setSplitEntries((prev) => {
      const exists = prev.find((e) => e.paymentMode === mode);
      if (exists) {
        return prev.length > 1 ? prev.filter((e) => e.paymentMode !== mode) : prev;
      }
      const next = [...prev, { paymentMode: mode, amount: '' }];
      return balanceSplitEntries(next, totalAmount);
    });
  };

  const updateSplitAmount = (mode: string, value: string) => {
    setSplitEntries((prev) => {
      const updated = prev.map((e) => (e.paymentMode === mode ? { ...e, amount: value } : e));
      return balanceSplitEntries(updated, totalAmount, mode);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicleNumber || !form.vehicleTypeId || !form.incomeSourceId || !form.amount || !form.centerId) {
      setError('Please fill all required fields.');
      return;
    }
    if (isSplit && Math.abs(splitRemaining) > 0.01) {
      setError(`Split amounts must add up to ₹${totalAmount}. Remaining: ₹${splitRemaining.toFixed(2)}`);
      return;
    }
    try {
      const splitPayments = splitEntries.map((e) => ({
        paymentMode: e.paymentMode as PaymentModeValue,
        amount: parseFloat(e.amount) || 0,
      }));
      await dispatch(
        createTransaction({
          vehicleNumber: form.vehicleNumber,
          vehicleTypeId: form.vehicleTypeId,
          incomeSourceId: form.incomeSourceId,
          amount: parseFloat(form.amount),
          centerId: form.centerId,
          transactionDate: form.transactionDate,
          paymentMode: isSplit ? 'SPLIT' : splitEntries[0].paymentMode,
          splitPayments,
          customerName: form.customerName || undefined,
          customerMobile: form.customerMobile || undefined,
          notes: form.notes || undefined,
        } as Parameters<typeof createTransaction>[0])
      ).unwrap();
      setSuccess(true);
      setForm(emptyForm(defaultCenterId));
      setSplitEntries([{ paymentMode: 'CASH', amount: '' }]);
    } catch (err: unknown) {
      setError(typeof err === 'string' ? err : 'Failed to create transaction');
    }
  };

  const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; color: string }> = ({ icon, title, color }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: '10px',
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
        {title}
      </Typography>
    </Box>
  );

  return (
    <Box maxWidth={720} mx="auto">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
          New Transaction Entry
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Record a pollution testing transaction
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        {/* ── Vehicle & Transaction Details ── */}
        <Card sx={{ mb: 2.5, borderRadius: '14px' }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <SectionHeader
              icon={<CarIcon sx={{ color: '#fff', fontSize: 20 }} />}
              title="Vehicle Details"
              color="linear-gradient(135deg, #000666 0%, #1a237e 100%)"
            />

            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Vehicle Number *"
                  name="vehicleNumber"
                  value={form.vehicleNumber}
                  onChange={handleChange}
                  placeholder="e.g. DL01AB1234"
                  helperText="Format: State Code + District + Series + Number"
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Vehicle Type *"
                  name="vehicleTypeId"
                  value={form.vehicleTypeId}
                  onChange={handleChange}
                >
                  <MenuItem value="">Select vehicle type</MenuItem>
                  {vehicleTypes.map((vt) => (
                    <MenuItem key={vt.id} value={vt.id}>
                      {vt.typeName} ({vt.typeCode}) — ₹{Number(vt.baseCharge)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* Income Source — no amount shown */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Income Source *"
                  name="incomeSourceId"
                  value={form.incomeSourceId}
                  onChange={handleChange}
                >
                  <MenuItem value="">Select income source</MenuItem>
                  {incomeSources.map((src) => (
                    <MenuItem key={src.id} value={src.id}>
                      {src.sourceName}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Amount — auto-filled but editable */}
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
                  label="Center *"
                  name="centerId"
                  value={form.centerId}
                  onChange={handleChange}
                >
                  {availableCenters.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.centerName} ({c.centerCode})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Transaction Date *"
                  name="transactionDate"
                  type="date"
                  value={form.transactionDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* ── Payment Mode ── */}
        <Card sx={{ mb: 2.5, borderRadius: '14px' }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <SectionHeader
              icon={<PaymentsIcon sx={{ color: '#fff', fontSize: 20 }} />}
              title="Payment Mode"
              color="linear-gradient(135deg, #006b5e 0%, #3d9b8f 100%)"
            />

            {/* Mode selector — multi-select toggles */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: isSplit || splitEntries.length > 0 ? 2 : 0 }}>
              {PAYMENT_MODES.map((pm) => {
                const selected = splitEntries.some((e) => e.paymentMode === pm.value);
                return (
                  <ToggleButton
                    key={pm.value}
                    value={pm.value}
                    selected={selected}
                    onChange={() => togglePaymentMode(pm.value)}
                    sx={{
                      px: 2.5,
                      py: 1,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#64748b',
                      textTransform: 'none',
                      border: '1.5px solid #e2e8f0 !important',
                      borderRadius: '8px !important',
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(0,6,102,0.08)',
                        color: '#000666',
                        borderColor: '#000666 !important',
                      },
                    }}
                  >
                    {pm.label}
                  </ToggleButton>
                );
              })}
            </Box>

            {/* Split amount inputs */}
            {splitEntries.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {isSplit && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SplitIcon sx={{ fontSize: 16, color: '#006b5e' }} />
                    <Typography variant="caption" sx={{ color: '#006b5e', fontWeight: 600 }}>
                      Split Payment — enter amount for each mode
                    </Typography>
                    {totalAmount > 0 && (
                      <Chip
                        size="small"
                        label={Math.abs(splitRemaining) < 0.01 ? 'Balanced ✓' : `₹${splitRemaining.toFixed(0)} remaining`}
                        sx={{
                          ml: 'auto',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          bgcolor: Math.abs(splitRemaining) < 0.01 ? 'rgba(0,107,94,0.1)' : 'rgba(239,68,68,0.1)',
                          color: Math.abs(splitRemaining) < 0.01 ? '#006b5e' : '#dc2626',
                        }}
                      />
                    )}
                  </Box>
                )}
                <Grid container spacing={1.5}>
                  {splitEntries.map((entry) => (
                    <Grid item xs={12} sm={isSplit ? 6 : 12} key={entry.paymentMode}>
                      <TextField
                        fullWidth
                        size="small"
                        label={PAYMENT_MODES.find((p) => p.value === entry.paymentMode)?.label}
                        type="number"
                        value={entry.amount}
                        onChange={(e) => updateSplitAmount(entry.paymentMode, e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                        inputProps={{ min: 0, step: 0.01 }}
                        placeholder={isSplit ? `Amount paid via ${PAYMENT_MODES.find((p) => p.value === entry.paymentMode)?.label}` : ''}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* ── Customer Details (optional) ── */}
        <Card sx={{ mb: 2.5, borderRadius: '14px' }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <SectionHeader
              icon={<PersonIcon sx={{ color: '#fff', fontSize: 20 }} />}
              title="Customer Details"
              color="linear-gradient(135deg, #475569 0%, #334155 100%)"
            />
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 2, mt: -1.5 }}>
              Optional — fill in if customer details are available
            </Typography>

            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Customer Name"
                  name="customerName"
                  value={form.customerName}
                  onChange={handleChange}
                  placeholder="e.g. Rajesh Kumar"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Mobile Number"
                  name="customerMobile"
                  value={form.customerMobile}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  inputProps={{ maxLength: 15 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">+91</InputAdornment>,
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* ── Notes & Submit ── */}
        <Card sx={{ borderRadius: '14px' }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <TextField
              fullWidth
              label="Notes (optional)"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              multiline
              rows={2}
              placeholder="Any additional remarks..."
              sx={{ mb: 2.5 }}
            />

            {error && (
              <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => setForm(emptyForm(defaultCenterId))}
                disabled={loading}
                sx={{ borderColor: '#e2e8f0', color: '#475569' }}
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
                disabled={loading}
                sx={{
                  minWidth: 160,
                  background: 'linear-gradient(135deg, #000666 0%, #1a237e 100%)',
                  boxShadow: '0 4px 12px rgba(0,6,102,0.25)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
                  },
                }}
              >
                {loading ? 'Saving...' : 'Save Transaction'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </form>

      <Snackbar
        open={success}
        autoHideDuration={4000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          Transaction recorded successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};
