import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../utils/apiClient';
import type { Settlement, ApiResponse } from '../../types';

interface SettlementState {
  settlements: Settlement[];
  loading: boolean;
  error: string | null;
  pagination: { total: number; page: number; limit: number; totalPages: number } | null;
}

const initialState: SettlementState = {
  settlements: [],
  loading: false,
  error: null,
  pagination: null,
};

export const fetchSettlements = createAsyncThunk(
  'settlements/fetchSettlements',
  async (filters: Record<string, unknown> = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/settlements', { params: filters });
      const payload = response.data?.data;
      const data = (Array.isArray(payload) ? payload : payload?.data ?? []) as Settlement[];
      const pagination = Array.isArray(payload) ? null : (payload?.pagination ?? null);
      return { data, pagination };
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to fetch settlements');
    }
  }
);

export const createSettlement = createAsyncThunk(
  'settlements/createSettlement',
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<ApiResponse<Settlement>>('/settlements', data);
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to create settlement');
    }
  }
);

export const rejectSettlement = createAsyncThunk(
  'settlements/rejectSettlement',
  async ({ id, notes }: { id: string; notes: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put<ApiResponse<Settlement>>(
        `/settlements/${id}/reject`,
        { notes }
      );
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to reject settlement');
    }
  }
);

export const deleteSettlement = createAsyncThunk(
  'settlements/deleteSettlement',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/settlements/${id}`);
      return id;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to delete settlement');
    }
  }
);

export const approveSettlement = createAsyncThunk(
  'settlements/approveSettlement',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.put<ApiResponse<Settlement>>(
        `/settlements/${id}/approve`,
        {}
      );
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to approve settlement');
    }
  }
);

const settlementSlice = createSlice({
  name: 'settlements',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettlements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettlements.fulfilled, (state, action) => {
        state.loading = false;
        state.settlements = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchSettlements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createSettlement.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSettlement.fulfilled, (state, action: PayloadAction<Settlement>) => {
        state.loading = false;
        state.settlements.unshift(action.payload);
      })
      .addCase(createSettlement.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(approveSettlement.fulfilled, (state, action: PayloadAction<Settlement>) => {
        const idx = state.settlements.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.settlements[idx] = action.payload;
      })
      .addCase(rejectSettlement.fulfilled, (state, action: PayloadAction<Settlement>) => {
        const idx = state.settlements.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.settlements[idx] = action.payload;
      })
      .addCase(deleteSettlement.fulfilled, (state, action: PayloadAction<string>) => {
        state.settlements = state.settlements.filter((s) => s.id !== action.payload);
      });
  },
});

export const { clearError } = settlementSlice.actions;
export default settlementSlice.reducer;
