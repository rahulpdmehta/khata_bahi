import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { LoginPage } from '../features/auth/LoginPage';
import { ProtectedRoute } from '../components/protected/ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { ROUTES } from '../utils/constants';
import { useAppSelector } from '../app/hooks';

// Lazy-loaded pages
const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const TransactionListPage = lazy(() =>
  import('../features/transactions/TransactionListPage').then((m) => ({ default: m.TransactionListPage }))
);
const TransactionEntryPage = lazy(() =>
  import('../features/transactions/TransactionEntryPage').then((m) => ({ default: m.TransactionEntryPage }))
);
const MyEntriesPage = lazy(() =>
  import('../features/transactions/MyEntriesPage').then((m) => ({ default: m.MyEntriesPage }))
);
const SettlementsPage = lazy(() =>
  import('../features/settlements/SettlementsPage').then((m) => ({ default: m.SettlementsPage }))
);
const ExpensesPage = lazy(() =>
  import('../features/expenses/ExpensesPage').then((m) => ({ default: m.ExpensesPage }))
);
const EditRequestsPage = lazy(() =>
  import('../features/editRequests/EditRequestsPage').then((m) => ({ default: m.EditRequestsPage }))
);
const UserManagementPage = lazy(() =>
  import('../features/admin/UserManagementPage').then((m) => ({ default: m.UserManagementPage }))
);
const CenterManagementPage = lazy(() =>
  import('../features/admin/CenterManagementPage').then((m) => ({ default: m.CenterManagementPage }))
);
const ReportPage = lazy(() =>
  import('../features/reports/ReportPage').then((m) => ({ default: m.ReportPage }))
);

const PageLoader: React.FC = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <CircularProgress sx={{ color: '#6366f1' }} />
  </Box>
);

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAppSelector((state) => state.auth);
  if (user?.role !== 'ADMIN') {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  return <>{children}</>;
};

const LayoutRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppLayout>
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
  </AppLayout>
);

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          {/* Dashboard */}
          <Route
            path={ROUTES.DASHBOARD}
            element={
              <LayoutRoute>
                <DashboardPage />
              </LayoutRoute>
            }
          />

          {/* Transactions */}
          <Route
            path="/transactions"
            element={
              <LayoutRoute>
                <TransactionListPage />
              </LayoutRoute>
            }
          />
          <Route
            path="/transactions/entry"
            element={
              <LayoutRoute>
                <TransactionEntryPage />
              </LayoutRoute>
            }
          />
          <Route
            path="/transactions/my-entries"
            element={
              <LayoutRoute>
                <MyEntriesPage />
              </LayoutRoute>
            }
          />

          {/* Settlements */}
          <Route
            path="/settlements"
            element={
              <LayoutRoute>
                <SettlementsPage />
              </LayoutRoute>
            }
          />

          {/* Expenses */}
          <Route
            path="/expenses"
            element={
              <LayoutRoute>
                <ExpensesPage />
              </LayoutRoute>
            }
          />

          {/* Edit Requests */}
          <Route
            path="/edit-requests"
            element={
              <LayoutRoute>
                <EditRequestsPage />
              </LayoutRoute>
            }
          />

          {/* Reports */}
          <Route
            path="/reports"
            element={
              <LayoutRoute>
                <ReportPage />
              </LayoutRoute>
            }
          />

          {/* Admin only */}
          <Route
            path="/admin/users"
            element={
              <LayoutRoute>
                <AdminRoute>
                  <UserManagementPage />
                </AdminRoute>
              </LayoutRoute>
            }
          />
          <Route
            path="/admin/centers"
            element={
              <LayoutRoute>
                <AdminRoute>
                  <CenterManagementPage />
                </AdminRoute>
              </LayoutRoute>
            }
          />
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </BrowserRouter>
  );
};
