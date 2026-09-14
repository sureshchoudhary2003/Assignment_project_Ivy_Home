import { createSlice } from '@reduxjs/toolkit';

// Helper to get user-specific storage key
const getStorageKey = () => {
  const userStr = localStorage.getItem('ivy_user');
  const email = userStr ? JSON.parse(userStr)?.email : 'default';
  return `ivy_favourites_${email}`;
};

const loadInitialFavourites = () => {
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const favouritesSlice = createSlice({
  name: 'favourites',
  initialState: {
    items: loadInitialFavourites(),
  },
  reducers: {
    toggleFavourite: (state, action) => {
      const listing = action.payload;
      const targetId = listing.listing_id || listing.id;
      const exists = state.items.some((item) => (item.listing_id || item.id) === targetId);

      if (exists) {
        state.items = state.items.filter((item) => (item.listing_id || item.id) !== targetId);
      } else {
        state.items.unshift(listing);
      }

      // Persist per-user
      localStorage.setItem(getStorageKey(), JSON.stringify(state.items));
    },
    removeFavourite: (state, action) => {
      const id = action.payload;
      state.items = state.items.filter((item) => (item.listing_id || item.id) !== id);
      localStorage.setItem(getStorageKey(), JSON.stringify(state.items));
    },
    reloadFavouritesForUser: (state) => {
      state.items = loadInitialFavourites();
    },
  },
});

export const { toggleFavourite, removeFavourite, reloadFavouritesForUser } = favouritesSlice.actions;
export default favouritesSlice.reducer;