import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

/** Display state for the Timeseries color-by legend (not bookmarked). */
export interface LegendState {
  ready: boolean;
  label: string;
  min: number | null;
  max: number | null;
  v_type: string | null;
  uniqueValues: (number | string)[] | null;
  width: number;
  height: number;
}

export const initialState: LegendState = {
  ready: false,
  label: "",
  min: null,
  max: null,
  v_type: null,
  uniqueValues: null,
  width: 0,
  height: 0,
};

export const legendSlice = createSlice({
  name: "legend",
  initialState,
  reducers: {
    setLegend: (state, action: PayloadAction<Partial<LegendState>>) => {
      Object.assign(state, action.payload);
    },
    setLegendSize: (
      state,
      action: PayloadAction<{ width: number; height: number }>,
    ) => {
      state.width = action.payload.width;
      state.height = action.payload.height;
    },
  },
});

export const { setLegend, setLegendSize } = legendSlice.actions;

export const selectLegend = (state: RootState) => state.legend;

export default legendSlice.reducer;
