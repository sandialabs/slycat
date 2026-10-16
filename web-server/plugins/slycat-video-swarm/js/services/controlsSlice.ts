import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

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
      state.colormap = action.payload;
    },
  },
});

export const { setColormap } = controlsSlice.actions;

export const selectColormap = (state: { controls: ControlsState }) => state.controls.colormap;

export default controlsSlice.reducer;
