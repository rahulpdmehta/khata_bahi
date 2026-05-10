import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../utils/apiClient';
import type { IncomeSource, VehicleType, ApiResponse } from '../../types';

interface MasterDataState {
  incomeSources: IncomeSource[];
  vehicleTypes: VehicleType[];
  loading: boolean;
  error: string | null;
}

const initialState: MasterDataState = {
  incomeSources: [],
  vehicleTypes: [],
  loading: false,
  error: null,
};

export const fetchIncomeSources = createAsyncThunk(
  'masterData/fetchIncomeSources',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<ApiResponse<IncomeSource[]>>('/master-data/income-sources');
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to fetch income sources');
    }
  }
);

export const fetchVehicleTypes = createAsyncThunk(
  'masterData/fetchVehicleTypes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<ApiResponse<VehicleType[]>>('/master-data/vehicle-types');
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to fetch vehicle types');
    }
  }
);

const masterDataSlice = createSlice({
  name: 'masterData',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIncomeSources.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIncomeSources.fulfilled, (state, action: PayloadAction<IncomeSource[]>) => {
        state.loading = false;
        state.incomeSources = action.payload;
      })
      .addCase(fetchIncomeSources.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchVehicleTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVehicleTypes.fulfilled, (state, action: PayloadAction<VehicleType[]>) => {
        state.loading = false;
        state.vehicleTypes = action.payload;
      })
      .addCase(fetchVehicleTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = masterDataSlice.actions;
export default masterDataSlice.reducer;
