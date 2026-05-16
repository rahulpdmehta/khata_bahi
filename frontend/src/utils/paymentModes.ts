export const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'C_TO_C', label: 'C to C' },
  { value: 'DISCOUNT', label: 'Discount' },
  { value: 'DUES', label: 'Dues' },
] as const;

export type PaymentModeValue = (typeof PAYMENT_MODES)[number]['value'];

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  C_TO_C: 'C to C',
  DISCOUNT: 'Discount',
  DUES: 'Dues',
  SPLIT: 'Split',
};

export function formatPaymentMode(mode: string): string {
  return PAYMENT_MODE_LABELS[mode] ?? mode.replace(/_/g, ' ');
}
