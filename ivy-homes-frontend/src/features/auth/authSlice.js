import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/axiosClient';

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/auth/login', credentials);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Login failed');
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  try {
    await axiosClient.post('/auth/logout');
  } catch {
    // Ignore server error on cleanup
  }
  localStorage.removeItem('ivy_token');
  localStorage.removeItem('ivy_refresh_token');
  localStorage.removeItem('ivy_user');
});

const token = localStorage.getItem('ivy_token');
const user = localStorage.getItem('ivy_user') ? JSON.parse(localStorage.getItem('ivy_user')) : null;

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user,
    token: token || null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        const accessToken = action.payload.access_token || action.payload.token;
        const refreshToken = action.payload.refresh_token;

        state.token = accessToken;
        state.user = action.payload.user;

        localStorage.setItem('ivy_token', accessToken);
        if (refreshToken) {
          localStorage.setItem('ivy_refresh_token', refreshToken);
        }
        localStorage.setItem('ivy_user', JSON.stringify(action.payload.user));
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.token = null;
        state.user = null;
      });
  },
});

export default authSlice.reducer;