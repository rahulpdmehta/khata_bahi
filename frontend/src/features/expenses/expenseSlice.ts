import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../utils/apiClient';
import type { Expense, ExpenseCategory, ApiResponse } from '../../types';

interface ExpenseState {
  expenses: Expense[];
  categories: ExpenseCategory[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
}

const initialState: ExpenseState = {
  expenses: [],
  categories: [],
  loading: false,
  error: null,
  pagination: null,
};

export const fetchExpenses = createAsyncThunk(
  'expenses/fetchExpenses',
  async (filters: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/expenses', { params: filters });
      return response.data?.data ?? { data: [], pagination: null };
    } catch (error: unknown) {
      if (error instanceof Error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return rejectWithValue((error as any).response?.data?.message || 'Failed to fetch expenses');
      }
      return rejectWithValue('Failed to fetch expenses');
    }
  }
);

export const createExpense = createAsyncThunk(
  'expenses/createExpense',
  async (expenseData: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<ApiResponse<Expense>>('/expenses', expenseData);
      return response.data.data!;
    } catch (error: unknown) {
      if (error instanceof Error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return rejectWithValue((error as any).response?.data?.message || 'Failed to create expense');
      }
      return rejectWithValue('Failed to create expense');
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'expenses/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<ApiResponse<ExpenseCategory[]>>('/expenses/categories');
      return response.data.data!;
    } catch (error: unknown) {
      if (error instanceof Error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return rejectWithValue((error as any).response?.data?.message || 'Failed to fetch categories');
      }
      return rejectWithValue('Failed to fetch categories');
    }
  }
);

export const approveExpense = createAsyncThunk(
  'expenses/approve',
  async (expenseId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<ApiResponse<Expense>>('/expenses/approve', {
        expenseId,
      });
      return response.data.data!;
    } catch (error: unknown) {
      if (error instanceof Error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return rejectWithValue((error as any).response?.data?.message || 'Failed to approve expense');
      }
      return rejectWithValue('Failed to approve expense');
    }
  }
);

export const rejectExpense = createAsyncThunk(
  'expenses/reject',
  async (
    { expenseId, rejectionReason }: { expenseId: string; rejectionReason: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post<ApiResponse<Expense>>('/expenses/reject', {
        expenseId,
        rejectionReason,
      });
      return response.data.data!;
    } catch (error: unknown) {
      if (error instanceof Error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return rejectWithValue((error as any).response?.data?.message || 'Failed to reject expense');
      }
      return rejectWithValue('Failed to reject expense');
    }
  }
);

export const deleteExpense = createAsyncThunk(
  'expenses/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/expenses/${id}`);
      return id;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to delete expense');
    }
  }
);

export const updateExpense = createAsyncThunk(
  'expenses/update',
  async ({ id, data }: { id: string; data: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put<ApiResponse<Expense>>(`/expenses/${id}`, data);
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to update expense');
    }
  }
);

const expenseSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchExpenses.fulfilled,
        (
          state,
          action: PayloadAction<{ data: Expense[]; pagination: Record<string, number> }>
        ) => {
          state.loading = false;
          state.expenses = action.payload.data;
          state.pagination = action.payload.pagination as ExpenseState['pagination'];
        }
      )
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createExpense.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createExpense.fulfilled, (state, action: PayloadAction<Expense>) => {
        state.loading = false;
        state.expenses.unshift(action.payload);
      })
      .addCase(createExpense.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<ExpenseCategory[]>) => {
        state.categories = action.payload;
      })
      .addCase(approveExpense.fulfilled, (state, action: PayloadAction<Expense>) => {
        const index = state.expenses.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) {
          state.expenses[index] = action.payload;
        }
      })
      .addCase(rejectExpense.fulfilled, (state, action: PayloadAction<Expense>) => {
        const index = state.expenses.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) {
          state.expenses[index] = action.payload;
        }
      })
      .addCase(deleteExpense.fulfilled, (state, action: PayloadAction<string>) => {
        state.expenses = state.expenses.filter((e) => e.id !== action.payload);
      })
      .addCase(updateExpense.fulfilled, (state, action: PayloadAction<Expense>) => {
        const index = state.expenses.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) {
          state.expenses[index] = action.payload;
        }
      });
  },
});

export const { clearError } = expenseSlice.actions;
export default expenseSlice.reducer;
