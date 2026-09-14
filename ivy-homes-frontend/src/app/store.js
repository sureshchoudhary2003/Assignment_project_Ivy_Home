import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import listingsReducer from '../features/listings/listingsSlice';
import favouritesReducer from '../features/favourites/favouritesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    listings: listingsReducer,
    favourites: favouritesReducer,
  },
});