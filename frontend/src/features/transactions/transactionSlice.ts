import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../utils/apiClient';
import type { Transaction, ApiResponse } from '../../types';

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface TransactionState {
  transactions: Transaction[];
  myEntries: Transaction[];
  loading: boolean;
  error: string | null;
  pagination: Pagination | null;
}

const initialState: TransactionState = {
  transactions: [],
  myEntries: [],
  loading: false,
  error: null,
  pagination: null,
};

export const fetchTransactions = createAsyncThunk(
  'transactions/fetchTransactions',
  async (filters: Record<string, unknown> = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<
        ApiResponse<{ data: Transaction[]; pagination: Pagination }>
      >('/transactions', { params: filters });
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to fetch transactions');
    }
  }
);

export const fetchMyEntries = createAsyncThunk(
  'transactions/fetchMyEntries',
  async (filters: Record<string, unknown> = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<ApiResponse<Transaction[]>>(
        '/transactions/my-entries',
        { params: filters }
      );
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to fetch entries');
    }
  }
);

export const createTransaction = createAsyncThunk(
  'transactions/createTransaction',
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<ApiResponse<Transaction>>('/transactions', data);
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to create transaction');
    }
  }
);

export const updateTransaction = createAsyncThunk(
  'transactions/updateTransaction',
  async ({ id, data }: { id: string; data: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put<ApiResponse<Transaction>>(`/transactions/${id}`, data);
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to update transaction');
    }
  }
);

export const deleteTransaction = createAsyncThunk(
  'transactions/deleteTransaction',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/transactions/${id}`);
      return id;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to delete transaction');
    }
  }
);

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchTransactions.fulfilled,
        (state, action: PayloadAction<{ data: Transaction[]; pagination: Pagination }>) => {
          state.loading = false;
          state.transactions = action.payload.data;
          state.pagination = action.payload.pagination;
        }
      )
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchMyEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchMyEntries.fulfilled,
        (state, action: PayloadAction<Transaction[]>) => {
          state.loading = false;
          state.myEntries = action.payload;
        }
      )
      .addCase(fetchMyEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTransaction.fulfilled, (state, action: PayloadAction<Transaction>) => {
        state.loading = false;
        state.transactions.unshift(action.payload);
        state.myEntries.unshift(action.payload);
      })
      .addCase(createTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateTransaction.fulfilled, (state, action: PayloadAction<Transaction>) => {
        const idx = state.transactions.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.transactions[idx] = action.payload;
      })
      .addCase(deleteTransaction.fulfilled, (state, action: PayloadAction<string>) => {
        state.transactions = state.transactions.filter((t) => t.id !== action.payload);
        state.myEntries = state.myEntries.filter((t) => t.id !== action.payload);
      });
  },
});

export const { clearError } = transactionSlice.actions;
export default transactionSlice.reducer;
