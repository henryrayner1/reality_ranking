import { combineReducers, configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import episodesReducer from './slices/episodesSlice';
import storage from 'redux-persist/lib/storage'
import persistReducer from 'redux-persist/es/persistReducer';
import persistStore from 'redux-persist/lib/persistStore';
import rankingsReducer from './slices/rankingsSlice';
import showReducer from './slices/showsSlice';
import seasonsReducer from './slices/seasonsSlice';

import {
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist'

const rootReducer = {
  user: userReducer,
  episodes: episodesReducer,
  activeRankings: rankingsReducer,
  shows: showReducer,
  seasons: seasonsReducer
};

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['user', 'episodes']
};

const persistedReducer = persistReducer(persistConfig, combineReducers(rootReducer));

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

// ✅ export these types for hooks
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
