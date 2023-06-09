import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface ScatterplotState {
  scatterplot_pane_width: number | undefined;
  scatterplot_pane_height: number | undefined;
  show_grid: boolean;
}

const initialState: ScatterplotState = {
  scatterplot_pane_width: undefined,
  scatterplot_pane_height: undefined,
  show_grid: false,
};

export const scatterplotSlice = createSlice({
  name: "scatterplot",
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
  },
});

// Action creators are generated for each case reducer function
export const { setScatterplotPaneWidth, setScatterplotPaneHeight, toggleShowGrid } =
  scatterplotSlice.actions;

// Selectors
export const selectScatterplotPaneWidth = (state: RootState) => state.scatterplot.scatterplot_pane_width;
export const selectScatterplotPaneHeight = (state: RootState) => state.scatterplot.scatterplot_pane_height;
export const selectShowGrid = (state: RootState) => state.scatterplot.show_grid;

export default scatterplotSlice.reducer;
