/** User-selectable payment modes (transactions & expenses) */
export const PAYMENT_MODES = ['CASH', 'UPI', 'C_TO_C', 'DISCOUNT', 'DUES'] as const;

export type PaymentModeValue = (typeof PAYMENT_MODES)[number];

/** Includes SPLIT for multi-mode transactions */
export const TRANSACTION_PAYMENT_MODES = [...PAYMENT_MODES, 'SPLIT'] as const;

export type TransactionPaymentModeValue = (typeof TRANSACTION_PAYMENT_MODES)[number];

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  C_TO_C: 'C to C',
  DISCOUNT: 'Discount',
  DUES: 'Dues',
  SPLIT: 'Split',
  BANK_TRANSFER: 'C to C',
  CARD: 'C to C',
  CHEQUE: 'C to C',
};

export function formatPaymentMode(mode: string): string {
  return PAYMENT_MODE_LABELS[mode] ?? mode.replace(/_/g, ' ');
}
