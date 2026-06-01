import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../utils/apiClient';
import type { Settlement, BatchSettlementGroup, SettlementListItem, ApiResponse } from '../../types';

export interface BatchPreviewDay {
  date: string;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  carryForwardAmount: number;
  finalAmount: number;
}

interface SettlementState {
  settlements: SettlementListItem[];
  loading: boolean;
  error: string | null;
  pagination: { total: number; page: number; limit: number; totalPages: number } | null;
  batchPreviewDays: BatchPreviewDay[] | null;
  batchPreviewLoading: boolean;
}

const initialState: SettlementState = {
  settlements: [],
  loading: false,
  error: null,
  pagination: null,
  batchPreviewDays: null,
  batchPreviewLoading: false,
};

export const fetchSettlements = createAsyncThunk(
  'settlements/fetchSettlements',
  async (filters: Record<string, unknown> = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/settlements', { params: filters });
      const payload = response.data?.data;
      const data = (Array.isArray(payload) ? payload : payload?.data ?? []) as SettlementListItem[];
      const pagination = Array.isArray(payload) ? null : (payload?.pagination ?? null);
      return { data, pagination };
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to fetch settlements');
    }
  }
);

export const fetchBatchPreview = createAsyncThunk(
  'settlements/fetchBatchPreview',
  async ({ centerId, endDate }: { centerId: string; endDate: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/settlements/batch-preview', {
        params: { centerId, endDate },
      });
      const data = response.data?.data;
      return Array.isArray(data) ? (data as BatchPreviewDay[]) : [];
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to fetch batch preview');
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

export const createBatchSettlements = createAsyncThunk(
  'settlements/createBatchSettlements',
  async (
    data: { centerId: string; endDate: string; settledAmount?: number; notes?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post<ApiResponse<Settlement[]>>('/settlements/batch', data);
      const result = response.data.data;
      return Array.isArray(result) ? result : [];
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to create batch settlements');
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

export const approveBatch = createAsyncThunk(
  'settlements/approveBatch',
  async (batchId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.put<ApiResponse<BatchSettlementGroup>>(
        `/settlements/batch/${batchId}/approve`,
        {}
      );
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to approve batch');
    }
  }
);

export const rejectBatch = createAsyncThunk(
  'settlements/rejectBatch',
  async ({ batchId, notes }: { batchId: string; notes: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put<ApiResponse<BatchSettlementGroup>>(
        `/settlements/batch/${batchId}/reject`,
        { notes }
      );
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to reject batch');
    }
  }
);

export const deleteBatch = createAsyncThunk(
  'settlements/deleteBatch',
  async (batchId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/settlements/batch/${batchId}`);
      return batchId;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to delete batch');
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
    clearBatchPreview: (state) => {
      state.batchPreviewDays = null;
      state.batchPreviewLoading = false;
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
      .addCase(fetchBatchPreview.pending, (state) => {
        state.batchPreviewLoading = true;
        state.error = null;
      })
      .addCase(fetchBatchPreview.fulfilled, (state, action) => {
        state.batchPreviewLoading = false;
        state.batchPreviewDays = action.payload;
      })
      .addCase(fetchBatchPreview.rejected, (state, action) => {
        state.batchPreviewLoading = false;
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
      .addCase(createBatchSettlements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBatchSettlements.fulfilled, (state, action: PayloadAction<Settlement[]>) => {
        state.loading = false;
        state.settlements.unshift(...action.payload);
      })
      .addCase(createBatchSettlements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(approveSettlement.fulfilled, (state, action: PayloadAction<Settlement>) => {
        const idx = state.settlements.findIndex((s) => s.type !== 'batch' && (s as Settlement).id === action.payload.id);
        if (idx !== -1) state.settlements[idx] = { ...action.payload, type: 'individual' };
      })
      .addCase(rejectSettlement.fulfilled, (state, action: PayloadAction<Settlement>) => {
        const idx = state.settlements.findIndex((s) => s.type !== 'batch' && (s as Settlement).id === action.payload.id);
        if (idx !== -1) state.settlements[idx] = { ...action.payload, type: 'individual' };
      })
      .addCase(deleteSettlement.fulfilled, (state, action: PayloadAction<string>) => {
        state.settlements = state.settlements.filter((s) => !(s.type !== 'batch' && (s as Settlement).id === action.payload));
      })
      .addCase(approveBatch.fulfilled, (state, action: PayloadAction<BatchSettlementGroup>) => {
        const idx = state.settlements.findIndex(
          (s) => s.type === 'batch' && s.batchId === action.payload.batchId
        );
        if (idx !== -1) state.settlements[idx] = action.payload;
      })
      .addCase(rejectBatch.fulfilled, (state, action: PayloadAction<BatchSettlementGroup>) => {
        const idx = state.settlements.findIndex(
          (s) => s.type === 'batch' && s.batchId === action.payload.batchId
        );
        if (idx !== -1) state.settlements[idx] = action.payload;
      })
      .addCase(deleteBatch.fulfilled, (state, action: PayloadAction<string>) => {
        state.settlements = state.settlements.filter(
          (s) => !(s.type === 'batch' && s.batchId === action.payload)
        );
      });
  },
});

export const { clearError, clearBatchPreview } = settlementSlice.actions;
export default settlementSlice.reducer;
