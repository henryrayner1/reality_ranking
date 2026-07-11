import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';

// user is the only slice left in Redux — shows/seasons/episodes/rankings all
// moved to React Query. It's deliberately not persisted here: it's already
// restored synchronously from its own localStorage key at store-creation
// time (see userSlice's initialState), which is authoritative. Persisting it
// here too via redux-persist's own (asynchronous) rehydration created two
// competing copies of the same state that could go stale relative to each
// other, e.g. a fresh login could get silently clobbered back to a previous
// (or logged-out) session once redux-persist's rehydration resolved a moment
// later.
export const store = configureStore({
  reducer: {
    user: userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
