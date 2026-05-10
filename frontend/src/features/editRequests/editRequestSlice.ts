import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../utils/apiClient';
import type { EditRequest, ApiResponse } from '../../types';

interface EditRequestState {
  editRequests: EditRequest[];
  loading: boolean;
  error: string | null;
}

const initialState: EditRequestState = {
  editRequests: [],
  loading: false,
  error: null,
};

export const fetchEditRequests = createAsyncThunk(
  'editRequests/fetchEditRequests',
  async (filters: Record<string, unknown> = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/edit-requests', { params: filters });
      const payload = response.data?.data;
      return (Array.isArray(payload) ? payload : payload?.data ?? []) as EditRequest[];
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to fetch edit requests');
    }
  }
);

export const createEditRequest = createAsyncThunk(
  'editRequests/createEditRequest',
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<ApiResponse<EditRequest>>('/edit-requests', data);
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to create edit request');
    }
  }
);

export const approveEditRequest = createAsyncThunk(
  'editRequests/approveEditRequest',
  async ({ id, reviewNotes }: { id: string; reviewNotes?: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put<ApiResponse<EditRequest>>(
        `/edit-requests/${id}/approve`,
        { reviewNotes }
      );
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to approve edit request');
    }
  }
);

export const rejectEditRequest = createAsyncThunk(
  'editRequests/rejectEditRequest',
  async ({ id, reviewNotes }: { id: string; reviewNotes: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put<ApiResponse<EditRequest>>(
        `/edit-requests/${id}/reject`,
        { reviewNotes }
      );
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to reject edit request');
    }
  }
);

const editRequestSlice = createSlice({
  name: 'editRequests',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEditRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEditRequests.fulfilled, (state, action: PayloadAction<EditRequest[]>) => {
        state.loading = false;
        state.editRequests = action.payload;
      })
      .addCase(fetchEditRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createEditRequest.fulfilled, (state, action: PayloadAction<EditRequest>) => {
        state.editRequests.unshift(action.payload);
      })
      .addCase(approveEditRequest.fulfilled, (state, action: PayloadAction<EditRequest>) => {
        const idx = state.editRequests.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.editRequests[idx] = action.payload;
      })
      .addCase(rejectEditRequest.fulfilled, (state, action: PayloadAction<EditRequest>) => {
        const idx = state.editRequests.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.editRequests[idx] = action.payload;
      });
  },
});

export const { clearError } = editRequestSlice.actions;
export default editRequestSlice.reducer;
