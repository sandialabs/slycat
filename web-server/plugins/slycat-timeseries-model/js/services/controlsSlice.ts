import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

export interface ControlsState {
  colormap: string;
}

export const initialState: ControlsState = {
  colormap: "night",
};

export const controlsSlice = createSlice({
  name: "controls",
  initialState,
  reducers: {
    setColormap: (state, action: PayloadAction<string>) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      state.colormap = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { setColormap } = controlsSlice.actions;

export const selectColormap = (state: RootState) => state.controls.colormap;

export default controlsSlice.reducer;
