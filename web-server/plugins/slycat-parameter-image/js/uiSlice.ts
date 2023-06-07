import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface UIState {
  scatterplot_pane_width: number | undefined;
  scatterplot_pane_height: number | undefined;
}

const initialState: UIState = {
  scatterplot_pane_width: undefined,
  scatterplot_pane_height: undefined,
};

export const uiSlice = createSlice({
  name: "ui",
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
  },
});

// Action creators are generated for each case reducer function
export const { setScatterplotPaneWidth, setScatterplotPaneHeight } = uiSlice.actions;

export default uiSlice.reducer;
