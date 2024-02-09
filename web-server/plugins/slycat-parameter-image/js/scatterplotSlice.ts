import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";

export const SLICE_NAME = "scatterplot";

export interface ScatterplotState {
  scatterplot_pane_width: number;
  scatterplot_pane_height: number;
  show_grid: boolean;
  show_histogram: boolean;
  auto_scale: boolean;
}

export const initialState: ScatterplotState = {
  scatterplot_pane_width: 0,
  scatterplot_pane_height: 0,
  show_grid: false,
  show_histogram: false,
  auto_scale: true,
};

export const scatterplotSlice = createSlice({
  name: SLICE_NAME,
  initialState,
  reducers: {
    setScatterplotPaneWidth: (state, action: PayloadAction<number>) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      state.scatterplot_pane_width = action.payload;
    },
    setScatterplotPaneHeight: (state, action: PayloadAction<number>) => {
      state.scatterplot_pane_height = action.payload;
    },
    toggleShowGrid: (state) => {
      state.show_grid = !state.show_grid;
    },
    toggleShowHistogram: (state) => {
      state.show_histogram = !state.show_histogram;
    },
    toggleAutoScale: (state) => {
      state.auto_scale = !state.auto_scale;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setScatterplotPaneWidth,
  setScatterplotPaneHeight,
  toggleShowGrid,
  toggleShowHistogram,
  toggleAutoScale,
} = scatterplotSlice.actions;

// Selectors
export const selectScatterplotPaneWidth = (state: RootState) =>
  state[SLICE_NAME].scatterplot_pane_width;
export const selectScatterplotPaneHeight = (state: RootState) =>
  state[SLICE_NAME].scatterplot_pane_height;
export const selectShowGrid = (state: RootState) => state[SLICE_NAME].show_grid;
export const selectShowHistogram = (state: RootState) => state[SLICE_NAME].show_histogram;
export const selectUnselectedPointSize = (state: RootState) => state.unselected_point_size;
export const selectUnselectedBorderSize = (state: RootState) => state.unselected_border_size;
export const selectSelectedPointSize = (state: RootState) => state.selected_point_size;
export const selectSelectedBorderSize = (state: RootState) => state.selected_border_size;
export const selectFontSize = (state: RootState) => state.fontSize;
export const selectFontFamily = (state: RootState) => state.fontFamily;
export const selectOpenMedia = (state: RootState) => state.open_media;
export const selectAutoScale = (state: RootState) => state[SLICE_NAME].auto_scale;

export default scatterplotSlice.reducer;
