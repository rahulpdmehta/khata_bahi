import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../utils/apiClient';
import type { Center, ApiResponse } from '../../types';

interface CenterState {
  centers: Center[];
  loading: boolean;
  error: string | null;
}

const initialState: CenterState = {
  centers: [],
  loading: false,
  error: null,
};

export const fetchCenters = createAsyncThunk(
  'centers/fetchCenters',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/admin/centers');
      const payload = response.data?.data;
      return (Array.isArray(payload) ? payload : payload?.data ?? []) as Center[];
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to fetch centers');
    }
  }
);

export const createCenter = createAsyncThunk(
  'centers/createCenter',
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<ApiResponse<Center>>('/admin/centers', data);
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to create center');
    }
  }
);

export const deleteCenter = createAsyncThunk(
  'centers/deleteCenter',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/admin/centers/${id}`);
      return id;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to delete center');
    }
  }
);

export const updateCenter = createAsyncThunk(
  'centers/updateCenter',
  async ({ id, data }: { id: string; data: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put<ApiResponse<Center>>(`/admin/centers/${id}`, data);
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to update center');
    }
  }
);

const centerSlice = createSlice({
  name: 'centers',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCenters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCenters.fulfilled, (state, action: PayloadAction<Center[]>) => {
        state.loading = false;
        state.centers = action.payload;
      })
      .addCase(fetchCenters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createCenter.fulfilled, (state, action: PayloadAction<Center>) => {
        state.centers.push(action.payload);
      })
      .addCase(updateCenter.fulfilled, (state, action: PayloadAction<Center>) => {
        const idx = state.centers.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.centers[idx] = action.payload;
      })
      .addCase(deleteCenter.fulfilled, (state, action: PayloadAction<string>) => {
        state.centers = state.centers.filter((c) => c.id !== action.payload);
      });
  },
});

export const { clearError } = centerSlice.actions;
export default centerSlice.reducer;
