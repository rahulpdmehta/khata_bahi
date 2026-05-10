export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Insurance Zone';

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
} as const;

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  TRANSACTIONS_ENTRY: '/transactions/entry',
  TRANSACTIONS_LIST: '/transactions/list',
  SETTLEMENTS: '/settlements',
  ADMIN_USERS: '/admin/users',
  ADMIN_CENTERS: '/admin/centers',
} as const;
