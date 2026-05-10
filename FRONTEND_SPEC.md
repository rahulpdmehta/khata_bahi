# Frontend Technical Specification

## Technology Stack

### Core
- **React**: 18.2+
- **TypeScript**: 5.0+
- **Vite**: 5.0+

### State Management
- **Redux Toolkit**: 2.0+
- **RTK Query**: For API calls and caching
- **Redux Persist**: For persisting auth state

### UI Framework
- **Material-UI (MUI)**: v5
  - @mui/material
  - @mui/icons-material
  - @mui/x-date-pickers
  - @mui/x-data-grid

### Forms & Validation
- **React Hook Form**: 7.48+
- **Zod**: 3.22+ (schema validation)

### Routing
- **React Router**: v6.20+

### Charts & Data Visualization
- **Recharts**: 2.10+ (for analytics dashboard)

### Date Handling
- **date-fns**: 3.0+

### HTTP Client
- **Axios**: 1.6+ (with RTK Query)

### Utilities
- **clsx**: For conditional classNames
- **lodash**: For utility functions (tree-shaking enabled)
- **react-to-print**: For printing reports
- **xlsx**: For Excel export
- **jspdf**: For PDF generation

### Testing
- **Vitest**: Unit testing
- **React Testing Library**: Component testing
- **Playwright**: E2E testing
- **MSW (Mock Service Worker)**: API mocking

### Code Quality
- **ESLint**: 8.50+
- **Prettier**: 3.0+
- **TypeScript ESLint**: Strict rules

---

## Folder Structure (Detailed)

```
frontend/
├── public/
│   ├── favicon.ico
│   └── logo.png
├── src/
│   ├── app/
│   │   ├── store.ts              # Redux store configuration
│   │   ├── hooks.ts              # Typed useDispatch & useSelector
│   │   └── rootReducer.ts        # Combine reducers
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── authSlice.ts
│   │   │   ├── authAPI.ts
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ChangePasswordModal.tsx
│   │   │   └── types.ts
│   │   │
│   │   ├── transactions/
│   │   │   ├── transactionSlice.ts
│   │   │   ├── transactionAPI.ts
│   │   │   ├── TransactionEntryPage.tsx
│   │   │   ├── TransactionListPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── TransactionForm.tsx
│   │   │   │   ├── TransactionTable.tsx
│   │   │   │   └── TransactionDetailModal.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useTransactionForm.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── dashboard/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── RevenueCards.tsx
│   │   │   │   ├── RevenueChart.tsx
│   │   │   │   ├── CenterPerformanceChart.tsx
│   │   │   │   ├── IncomeBreakdownPie.tsx
│   │   │   │   ├── VehicleDistributionChart.tsx
│   │   │   │   └── TrendAnalysisChart.tsx
│   │   │   ├── dashboardAPI.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── settlements/
│   │   │   ├── settlementSlice.ts
│   │   │   ├── settlementAPI.ts
│   │   │   ├── SettlementPage.tsx
│   │   │   ├── SettlementHistoryPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── SettlementForm.tsx
│   │   │   │   ├── SettlementTable.tsx
│   │   │   │   └── SettlementApprovalModal.tsx
│   │   │   └── types.ts
│   │   │
│   │   ├── editRequests/
│   │   │   ├── editRequestSlice.ts
│   │   │   ├── editRequestAPI.ts
│   │   │   ├── EditRequestPage.tsx
│   │   │   ├── EditRequestReviewPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── EditRequestForm.tsx
│   │   │   │   ├── EditRequestTable.tsx
│   │   │   │   └── EditRequestReviewModal.tsx
│   │   │   └── types.ts
│   │   │
│   │   ├── reports/
│   │   │   ├── ReportsPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── ReportFilters.tsx
│   │   │   │   ├── ReportTable.tsx
│   │   │   │   ├── ReportCharts.tsx
│   │   │   │   └── ExportButtons.tsx
│   │   │   ├── reportAPI.ts
│   │   │   ├── utils/
│   │   │   │   ├── pdfGenerator.ts
│   │   │   │   └── excelGenerator.ts
│   │   │   └── types.ts
│   │   │
│   │   └── admin/
│   │       ├── users/
│   │       │   ├── UserManagementPage.tsx
│   │       │   ├── components/
│   │       │   │   ├── UserTable.tsx
│   │       │   │   ├── UserFormModal.tsx
│   │       │   │   └── AssignCenterModal.tsx
│   │       │   ├── userAPI.ts
│   │       │   └── types.ts
│   │       ├── centers/
│   │       │   ├── CenterManagementPage.tsx
│   │       │   ├── components/
│   │       │   │   ├── CenterTable.tsx
│   │       │   │   └── CenterFormModal.tsx
│   │       │   ├── centerAPI.ts
│   │       │   └── types.ts
│   │       └── settings/
│   │           ├── SettingsPage.tsx
│   │           ├── components/
│   │           │   ├── IncomeSourcesConfig.tsx
│   │           │   ├── VehicleTypesConfig.tsx
│   │           │   └── SystemSettings.tsx
│   │           └── types.ts
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Breadcrumbs.tsx
│   │   │
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── DatePicker.tsx
│   │   │   ├── DateRangePicker.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Loader.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── Toast.tsx
│   │   │
│   │   └── protected/
│   │       ├── ProtectedRoute.tsx
│   │       └── RoleGuard.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePermissions.ts
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useToast.ts
│   │   └── useConfirm.ts
│   │
│   ├── utils/
│   │   ├── apiClient.ts          # Axios instance with interceptors
│   │   ├── validators.ts         # Zod schemas
│   │   ├── formatters.ts         # Date, currency formatters
│   │   ├── constants.ts          # App constants
│   │   ├── helpers.ts            # Utility functions
│   │   └── permissions.ts        # Role-based permissions
│   │
│   ├── routes/
│   │   ├── index.tsx             # Main router configuration
│   │   ├── staffRoutes.tsx
│   │   ├── adminRoutes.tsx
│   │   └── publicRoutes.tsx
│   │
│   ├── types/
│   │   ├── global.d.ts
│   │   ├── api.types.ts
│   │   └── redux.types.ts
│   │
│   ├── theme/
│   │   ├── theme.ts              # MUI theme configuration
│   │   ├── colors.ts
│   │   └── typography.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── .env.example
├── .env.development
├── .env.production
├── .eslintrc.json
├── .prettierrc
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── package.json
└── README.md
```

---

## Key Components Specification

### 1. Authentication Flow

#### LoginPage.tsx
```typescript
interface LoginFormData {
  username: string;
  password: string;
}

Features:
- Form validation with Zod
- Error handling
- Loading state
- Remember me functionality
- Redirect after login based on role
```

#### authSlice.ts
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

Actions:
- login
- logout
- refreshToken
- updateProfile
```

### 2. Transaction Entry

#### TransactionForm.tsx
```typescript
interface TransactionFormData {
  vehicleNumber: string;
  vehicleTypeId: string;
  incomeSourceId: string;
  amount: number;
  notes?: string;
}

Features:
- Auto-complete for vehicle numbers
- Real-time amount calculation
- Validation
- Success/error feedback
- Clear form after submission
```

### 3. Dashboard

#### DashboardPage.tsx
```typescript
Layout:
- Top: Filter bar (date range, center, income source)
- Row 1: Revenue cards (Today, Week, Month, Total)
- Row 2: Revenue trend chart (line chart)
- Row 3: Center performance (bar chart) + Income breakdown (pie chart)
- Row 4: Vehicle distribution (donut chart) + Recent transactions table
```

### 4. Settlement Module

#### SettlementForm.tsx
```typescript
interface SettlementData {
  settlementDate: Date;
  totalAmount: number;
  carryForwardAmount: number;
  netAmount: number;
  notes?: string;
}

Features:
- Auto-calculate from transactions
- Show carry-forward from previous day
- Confirmation dialog
- Generate receipt
```

### 5. Reports

#### ReportsPage.tsx
```typescript
Features:
- Advanced filters (date range, center, income source, vehicle type)
- Data table with pagination
- Charts visualization
- Export to PDF/Excel/CSV
- Print functionality
- Save report templates
```

---

## State Management Architecture

### Redux Store Structure
```typescript
{
  auth: AuthState,
  transactions: TransactionState,
  settlements: SettlementState,
  editRequests: EditRequestState,
  dashboard: DashboardState,
  users: UserState,
  centers: CenterState,
  ui: UIState // for modals, toasts, etc.
}
```

### RTK Query API Slices
```typescript
// transactionAPI.ts
export const transactionAPI = createApi({
  reducerPath: 'transactionAPI',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Transaction'],
  endpoints: (builder) => ({
    getTransactions: builder.query({ ... }),
    createTransaction: builder.mutation({ ... }),
    updateTransaction: builder.mutation({ ... }),
    deleteTransaction: builder.mutation({ ... }),
  }),
});
```

---

## Routing Structure

```typescript
// Main Routes
/login
/

// Staff Routes (Protected)
/dashboard
/transactions/entry
/transactions/list
/edit-requests
/settlements
/settlements/history
/profile

// Admin Routes (Protected + Admin only)
/admin/dashboard
/admin/users
/admin/centers
/admin/edit-requests/review
/admin/settlements/approve
/admin/reports
/admin/settings
```

---

## Form Validation Examples

```typescript
// Transaction Form Schema
const transactionSchema = z.object({
  vehicleNumber: z
    .string()
    .min(1, 'Vehicle number is required')
    .regex(/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/, 'Invalid vehicle number'),
  vehicleTypeId: z.string().uuid('Invalid vehicle type'),
  incomeSourceId: z.string().uuid('Invalid income source'),
  amount: z.number().positive('Amount must be positive'),
  notes: z.string().max(500).optional(),
});
```

---

## API Integration

### Axios Instance Configuration
```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or logout
    }
    return Promise.reject(error);
  }
);
```

---

## Performance Optimization

### Code Splitting
```typescript
// Lazy load routes
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const TransactionListPage = lazy(() => import('./features/transactions/TransactionListPage'));
```

### Memoization
```typescript
// Memoize expensive components
export const TransactionTable = React.memo(({ data, onEdit, onDelete }) => {
  // Component logic
});

// Memoize selectors
export const selectFilteredTransactions = createSelector(
  [selectAllTransactions, selectFilters],
  (transactions, filters) => {
    // Filter logic
  }
);
```

### Virtual Scrolling
```typescript
// Use MUI DataGrid for large tables
<DataGrid
  rows={transactions}
  columns={columns}
  pageSize={50}
  rowsPerPageOptions={[25, 50, 100]}
  pagination
  virtualization
/>
```

---

## Error Handling

### Error Boundary
```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

### API Error Handling
```typescript
try {
  await createTransaction(data);
  showToast('Transaction created successfully', 'success');
} catch (error) {
  if (error.response?.status === 400) {
    showToast(error.response.data.message, 'error');
  } else {
    showToast('Something went wrong', 'error');
  }
}
```

---

## Testing Strategy

### Unit Tests
```typescript
// transactionSlice.test.ts
describe('transactionSlice', () => {
  it('should handle createTransaction.fulfilled', () => {
    const state = transactionReducer(
      initialState,
      createTransaction.fulfilled(mockTransaction, '', mockData)
    );
    expect(state.transactions).toHaveLength(1);
  });
});
```

### Component Tests
```typescript
// TransactionForm.test.tsx
describe('TransactionForm', () => {
  it('should validate vehicle number format', async () => {
    render(<TransactionForm />);
    const input = screen.getByLabelText('Vehicle Number');
    await userEvent.type(input, 'INVALID');
    expect(screen.getByText('Invalid vehicle number')).toBeInTheDocument();
  });
});
```

### E2E Tests
```typescript
// transaction.spec.ts (Playwright)
test('should create new transaction', async ({ page }) => {
  await page.goto('/transactions/entry');
  await page.fill('[name="vehicleNumber"]', 'DL01AB1234');
  await page.selectOption('[name="vehicleTypeId"]', '...');
  await page.click('button[type="submit"]');
  await expect(page.locator('.toast-success')).toBeVisible();
});
```

---

## Accessibility

- All forms have proper labels
- Keyboard navigation support
- ARIA attributes for screen readers
- Color contrast ratio >= 4.5:1
- Focus indicators
- Skip navigation links

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Environment Variables

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_APP_NAME=Pollution Center Management
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=false
```

---

## Build Configuration

### vite.config.ts
```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          mui: ['@mui/material', '@mui/icons-material'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,css,md}\"",
    "type-check": "tsc --noEmit"
  }
}
```

---

This frontend specification provides a complete blueprint for implementing the React + TypeScript application following all the coding standards and best practices outlined in your rules.
