import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/axiosClient';

// Helper to get current user storage key
const getStorageKey = () => {
  const userStr = localStorage.getItem('ivy_user');
  const email = userStr ? JSON.parse(userStr)?.email : 'guest';
  return `ivy_favourites_${email}`;
};

const getLocalFavs = () => {
  try {
    return JSON.parse(localStorage.getItem(getStorageKey())) || [];
  } catch {
    return [];
  }
};

const setLocalFavs = (items) => {
  localStorage.setItem(getStorageKey(), JSON.stringify(items));
};

export const fetchFavourites = createAsyncThunk('favourites/fetch', async () => {
  try {
    // Try server endpoint (might work in some environments/aliases)
    const res = await axiosClient.get('/v1/favourites');
    if (res.data?.results) return res.data.results;
  } catch {
    // Expected 404 fallback: Read from persistent per-user local storage
  }
  return getLocalFavs();
});

export const addFavourite = createAsyncThunk('favourites/add', async (listing, { getState }) => {
  const state = getState();
  // Attempt optional server POST
  try {
    await axiosClient.post('/v1/favourites', { id: listing.listing_id || listing.id });
  } catch {
    // Ignore 404
  }

  const current = getLocalFavs();
  const listingId = listing.listing_id || listing.id;
  if (!current.some((item) => (item.listing_id || item.id) === listingId)) {
    const updated = [listing, ...current];
    setLocalFavs(updated);
    return updated;
  }
  return current;
});

export const removeFavourite = createAsyncThunk('favourites/remove', async (id) => {
  try {
    await axiosClient.delete(`/v1/favourites/${id}`);
  } catch {
    // Ignore 404
  }

  const current = getLocalFavs();
  const updated = current.filter((item) => (item.listing_id || item.id) !== id);
  setLocalFavs(updated);
  return id;
});

const favouritesSlice = createSlice({
  name: 'favourites',
  initialState: { items: [], loading: false },
  reducers: {
    clearFavouritesState: (state) => {
      state.items = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFavourites.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchFavourites.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(addFavourite.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(removeFavourite.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => (item.listing_id || item.id) !== action.payload);
      });
  },
});

export const { clearFavouritesState } = favouritesSlice.actions;
export default favouritesSlice.reducer;