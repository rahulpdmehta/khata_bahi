import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../utils/apiClient';
import type { User, ApiResponse } from '../../types';

interface UserState {
  users: User[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

const initialState: UserState = {
  users: [],
  loading: false,
  loaded: false,
  error: null,
};

// Cached: skips the call if users are already loaded (and not in-flight).
// Pass { force: true } to refetch; create/update/delete keep the cache fresh.
export const fetchUsers = createAsyncThunk<User[], { force?: boolean } | void>(
  'users/fetchUsers',
  async (_arg, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/admin/users');
      const payload = response.data?.data;
      return (Array.isArray(payload) ? payload : payload?.data ?? []) as User[];
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to fetch users');
    }
  },
  {
    condition: (arg, { getState }) => {
      const s = (getState() as { users: UserState }).users;
      if (s.loading) return false;
      if (s.loaded && !(arg && arg.force)) return false;
      return true;
    },
  }
);

export const createUser = createAsyncThunk(
  'users/createUser',
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<ApiResponse<User>>('/admin/users', data);
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to create user');
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, data }: { id: string; data: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put<ApiResponse<User>>(`/admin/users/${id}`, data);
      return response.data.data!;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to update user');
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/admin/users/${id}`);
      return id;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rejectWithValue((error as any).response?.data?.message || 'Failed to delete user');
    }
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<User[]>) => {
        state.loading = false;
        state.loaded = true;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.users.push(action.payload);
      })
      .addCase(updateUser.fulfilled, (state, action: PayloadAction<User>) => {
        const idx = state.users.findIndex((u) => u.id === action.payload.id);
        if (idx !== -1) state.users[idx] = action.payload;
      })
      .addCase(deleteUser.fulfilled, (state, action: PayloadAction<string>) => {
        state.users = state.users.filter((u) => u.id !== action.payload);
      });
  },
});

export const { clearError } = userSlice.actions;
export default userSlice.reducer;
