import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import expenseReducer from '../features/expenses/expenseSlice';
import transactionReducer from '../features/transactions/transactionSlice';
import editRequestReducer from '../features/editRequests/editRequestSlice';
import settlementReducer from '../features/settlements/settlementSlice';
import masterDataReducer from '../features/masterData/masterDataSlice';
import userReducer from '../features/admin/userSlice';
import centerReducer from '../features/admin/centerSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    expenses: expenseReducer,
    transactions: transactionReducer,
    editRequests: editRequestReducer,
    settlements: settlementReducer,
    masterData: masterDataReducer,
    users: userReducer,
    centers: centerReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
