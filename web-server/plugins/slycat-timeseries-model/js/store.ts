import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "./apiSlice";
import controlsReducer from './services/controlsSlice'
import modelSlice from './services/modelSlice'

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    controls: controlsReducer,
    model: modelSlice,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
});

// Infer the `RootState` and `AppDispatch` and `AppSubscribe` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type AppSubscribe = typeof store.subscribe