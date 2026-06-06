import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../utils/apiClient';
import type { IncomeSource, VehicleType, ApiResponse } from '../../types';

interface MasterDataState {
  incomeSources: IncomeSource[];
  vehicleTypes: VehicleType[];
  incomeSourcesLoaded: boolean;
  vehicleTypesLoaded: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: MasterDataState = {
  incomeSources: [],
  vehicleTypes: [],
  incomeSourcesLoaded: false,
  vehicleTypesLoaded: false,
  loading: false,
  error: null,
};

// Master data is effectively static — cache it. Skips the call once loaded;
// pass { force: true } to refetch.
export const fetchIncomeSources = createAsyncThunk<IncomeSource[], { force?: boolean } | void>(
  'masterData/fetchIncomeSources',
  async (_arg, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<ApiResponse<IncomeSource[]>>('/master-data/income-sources');
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to fetch income sources');
    }
  },
  {
    condition: (arg, { getState }) => {
      const s = (getState() as { masterData: MasterDataState }).masterData;
      if (s.incomeSourcesLoaded && !(arg && arg.force)) return false;
      return true;
    },
  }
);

export const fetchVehicleTypes = createAsyncThunk<VehicleType[], { force?: boolean } | void>(
  'masterData/fetchVehicleTypes',
  async (_arg, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<ApiResponse<VehicleType[]>>('/master-data/vehicle-types');
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to fetch vehicle types');
    }
  },
  {
    condition: (arg, { getState }) => {
      const s = (getState() as { masterData: MasterDataState }).masterData;
      if (s.vehicleTypesLoaded && !(arg && arg.force)) return false;
      return true;
    },
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
        state.incomeSourcesLoaded = true;
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
        state.vehicleTypesLoaded = true;
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
