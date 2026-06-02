export interface User {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  isActive?: boolean;
  centers: Center[];
}

export interface Center {
  id: string;
  centerCode: string;
  centerName: string;
  address?: string;
  contactNumber?: string;
  email?: string;
  isActive: boolean;
}

export interface ExpenseCategory {
  id: string;
  categoryName: string;
  categoryCode: string;
  approvalThreshold?: number;
  isActive: boolean;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  centerId: string;
  categoryId: string;
  userId?: string;
  amount: number;
  paymentMode: 'CASH' | 'UPI' | 'C_TO_C' | 'DISCOUNT' | 'DUES';
  vendorName?: string;
  description?: string;
  receiptUrl?: string;
  expenseDate: string;
  createdAt?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  category?: ExpenseCategory;
  center?: Center;
  user?: Partial<User>;
}

export interface DashboardOverview {
  today: {
    income: number;
    expenses: number;
    profit: number;
    transactionCount?: number;
  };
  week: {
    income: number;
    expenses: number;
    profit: number;
  };
  month: {
    income: number;
    expenses: number;
    profit: number;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface VehicleType {
  id: string;
  typeName: string;
  typeCode: string;
  baseCharge: number;
  isActive: boolean;
}

export interface IncomeSource {
  id: string;
  sourceName: string;
  sourceCode: string;
  defaultAmount: number;
  isActive: boolean;
}

export interface TransactionPayment {
  id: string;
  transactionId: string;
  paymentMode: string;
  amount: number;
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  centerId: string;
  userId: string;
  vehicleTypeId: string;
  vehicleNumber: string;
  incomeSourceId: string;
  amount: number;
  transactionDate: string;
  transactionTime: string;
  paymentMode?: string;
  payments?: TransactionPayment[];
  customerName?: string;
  customerMobile?: string;
  notes?: string;
  isLocked: boolean;
  createdBy: string;
  vehicleType?: VehicleType;
  incomeSource?: IncomeSource;
  center?: Center;
  user?: Partial<User>;
}

export interface EditRequest {
  id: string;
  transactionId?: string;
  expenseId?: string;
  settlementId?: string;
  resourceType: 'TRANSACTION' | 'EXPENSE' | 'SETTLEMENT';
  requestedBy: string;
  requestReason: string;
  originalData: Record<string, unknown>;
  proposedChanges: Record<string, unknown>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewNotes?: string;
  requestedAt: string;
  transaction?: Transaction;
  expense?: Expense;
  settlement?: Settlement;
  requester?: Partial<User>;
  reviewer?: Partial<User>;
}

export interface Settlement {
  type?: 'individual';
  id: string;
  settlementNumber: string;
  centerId: string;
  userId: string;
  settlementDate: string;
  createdAt?: string;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  carryForwardAmount: number;
  finalAmount: number;
  settledAmount: number;
  remainingAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  notes?: string;
  batchId?: string;
  center?: Center;
  user?: Partial<User>;
}

export interface BatchSettlementGroup {
  type: 'batch';
  batchId: string;
  centerId: string;
  centerName: string;
  startDate: string;
  endDate: string;
  count: number;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  carryForwardAmount: number;
  settledAmount: number;
  remainingAmount: number;
  finalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  days: { date: string; netAmount: number; settledAmount: number }[];
}

export type SettlementListItem = Settlement | BatchSettlementGroup;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TrendDataPoint {
  date: string;
  income: number;
  expenses: number;
}

export interface CenterPerformance {
  center: Center;
  income: number;
  expenses: number;
  profit: number;
}

export interface ExpenseBreakdown {
  category: ExpenseCategory;
  totalAmount: number;
  count: number;
}
