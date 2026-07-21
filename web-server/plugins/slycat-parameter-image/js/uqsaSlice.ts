import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";

export const SLICE_NAME = "uqsa";

export type UqsaActiveView = "means-ci" | "pearsons" | null;
export type UqsaStatus = "idle" | "loading" | "succeeded" | "failed";

export type HeatmapCell = {
  x: string;
  y: string;
  value: number | null;
};

export interface UqsaState {
  activeView: UqsaActiveView;
  status: UqsaStatus;
  error: string | null;
  // Gallery-shaped cells for Heatmap — used by both means-ci and pearsons
  heatmapCells: HeatmapCell[] | null;
  paneWidth: number;
  paneHeight: number;
}

export const initialState: UqsaState = {
  activeView: null,
  status: "idle",
  error: null,
  heatmapCells: null,
  paneWidth: 0,
  paneHeight: 0,
};

export const uqsaSlice = createSlice({
  name: SLICE_NAME,
  initialState,
  reducers: {
    setActiveView: (state, action: PayloadAction<UqsaActiveView>) => {
      // Same choice again: keep existing results, do not refetch
      if (state.activeView === action.payload) {
        return;
      }
      state.activeView = action.payload;
      // Clear previous results when switching views
      state.status = "idle";
      state.error = null;
      state.heatmapCells = null;
    },
    setStatus: (state, action: PayloadAction<UqsaStatus>) => {
      state.status = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.status = action.payload ? "failed" : state.status;
    },
    setHeatmapResult: (state, action: PayloadAction<{ heatmapCells: HeatmapCell[] }>) => {
      state.heatmapCells = action.payload.heatmapCells;
      state.status = "succeeded";
      state.error = null;
    },
    clearResults: (state) => {
      state.status = "idle";
      state.error = null;
      state.heatmapCells = null;
    },
    setPaneSize: (state, action: PayloadAction<{ width: number; height: number }>) => {
      state.paneWidth = action.payload.width;
      state.paneHeight = action.payload.height;
    },
  },
});

export const {
  setActiveView,
  setStatus,
  setError,
  setHeatmapResult,
  clearResults,
  setPaneSize,
} = uqsaSlice.actions;

export const selectUqsaActiveView = (state: RootState) => state[SLICE_NAME].activeView;
export const selectUqsaStatus = (state: RootState) => state[SLICE_NAME].status;
export const selectUqsaError = (state: RootState) => state[SLICE_NAME].error;
export const selectUqsaHeatmapCells = (state: RootState) => state[SLICE_NAME].heatmapCells;
export const selectUqsaPaneWidth = (state: RootState) => state[SLICE_NAME].paneWidth;
export const selectUqsaPaneHeight = (state: RootState) => state[SLICE_NAME].paneHeight;

export default uqsaSlice.reducer;
