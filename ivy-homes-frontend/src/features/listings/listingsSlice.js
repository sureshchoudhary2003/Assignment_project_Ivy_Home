import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/axiosClient';

export const fetchListings = createAsyncThunk(
  'listings/fetchListings',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/v1/listings', { params: filters });
      return { data: response.data, appliedFilters: filters };
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch listings');
    }
  }
);

const listingsSlice = createSlice({
  name: 'listings',
  initialState: {
    rawItems: [],
    filteredItems: [],
    total: 0,
    offset: 0,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchListings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchListings.fulfilled, (state, action) => {
        state.loading = false;
        const results = (action.payload.data.results || []).map((item) => {
          // Normalize square meter discrepancy found during data pull
          const isSqm = item.listing_id?.startsWith('MAG-') || item.website === 'magichomes';
          return {
            ...item,
            carpet_area_sqft: isSqm ? Math.round(item.carpet_area * 10.7639) : item.carpet_area,
            is_sqm_converted: isSqm,
          };
        });

        state.rawItems = results;
        state.total = action.payload.data.total ?? results.length;
        state.offset = action.payload.appliedFilters.offset || 0;

        // Defensive client-side filters (locality, bhk, furnishing, price)
        const f = action.payload.appliedFilters;
        state.filteredItems = results.filter((item) => {
          if (f.locality && item.locality?.toLowerCase() !== f.locality.toLowerCase().trim()) return false;
          if (f.bhk && Number(item.bedroom) !== Number(f.bhk)) return false;
          if (f.furnishing && item.furnishing?.toLowerCase() !== f.furnishing.toLowerCase().trim()) return false;
          if (f.min_price && Number(item.price) < Number(f.min_price)) return false;
          if (f.max_price && Number(item.price) > Number(f.max_price)) return false;
          return true;
        });
      })
      .addCase(fetchListings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default listingsSlice.reducer;