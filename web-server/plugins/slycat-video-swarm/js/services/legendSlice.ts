import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

/** Display state for the Video Swarm color-by legend (not bookmarked). */
export interface LegendState {
  ready: boolean;
  label: string;
  min: number | null;
  max: number | null;
}

export const initialState: LegendState = {
  ready: false,
  label: "",
  min: null,
  max: null,
};

export const legendSlice = createSlice({
  name: "legend",
  initialState,
  reducers: {
    setLegend: (state, action: PayloadAction<Partial<LegendState>>) => {
      Object.assign(state, action.payload);
    },
  },
});

export const { setLegend } = legendSlice.actions;

export const selectLegend = (state: { legend: LegendState }) => state.legend;

export default legendSlice.reducer;
