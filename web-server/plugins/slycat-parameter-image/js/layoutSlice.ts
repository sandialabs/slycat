import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";

export const SLICE_NAME = "layout";

// size === 0 means the user has not chosen a size: auto-fit / the layout default.
// West is the filters pane. East is the UQ/SA pane. Both store that one number
// here so analysis state does not keep pane geometry.
export interface LayoutPaneState {
  size: number;
}

export interface LayoutState {
  west: LayoutPaneState;
  east: LayoutPaneState;
}

export const initialState: LayoutState = {
  west: {
    size: 0,
  },
  east: {
    size: 0,
  },
};

export const layoutSlice = createSlice({
  name: SLICE_NAME,
  initialState,
  reducers: {
    setWestPaneSize: (state, action: PayloadAction<number>) => {
      state.west.size = action.payload;
    },
    setEastPaneSize: (state, action: PayloadAction<number>) => {
      state.east.size = action.payload;
    },
  },
});

export const { setWestPaneSize, setEastPaneSize } = layoutSlice.actions;

export const selectLayoutWestSize = (state: RootState) => state[SLICE_NAME].west.size;
export const selectLayoutEastSize = (state: RootState) => state[SLICE_NAME].east.size;

export default layoutSlice.reducer;
