import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";

export const SLICE_NAME = "layout";

// size === 0 means not user-set: auto-fit / default.
// south and east can be added later without a new bookmark scheme.
export interface LayoutPaneState {
  size: number;
}

export interface LayoutState {
  west: LayoutPaneState;
}

export const initialState: LayoutState = {
  west: {
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
  },
});

export const { setWestPaneSize } = layoutSlice.actions;

export const selectLayoutWestSize = (state: RootState) => state[SLICE_NAME].west.size;

export default layoutSlice.reducer;
