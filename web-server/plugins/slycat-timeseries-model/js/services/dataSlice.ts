import { createSlice, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";
import _ from "lodash";

export const SLICE_NAME = "data";

export interface DataState {
  selected_simulations: number[];
  hidden_simulations: number[];
}

export const initialState: DataState = {
  selected_simulations: [],
  hidden_simulations: [],
};

export const dataSlice = createSlice({
  name: SLICE_NAME,
  initialState,
  reducers: {
    setSelectedSimulations: (state, action: PayloadAction<number[]>) => {
      state.selected_simulations = _.cloneDeep(action.payload);
    },
    setHiddenSimulations: (state, action: PayloadAction<number[]>) => {
      state.hidden_simulations = _.cloneDeep(action.payload);
    },
  },
});

// Action creators are generated for each case reducer function
export const { setSelectedSimulations, setHiddenSimulations } =
  dataSlice.actions;

// Selectors
export const selectSelectedSimulations = (state: RootState) =>
  state[SLICE_NAME].selected_simulations;

export const selectHiddenSimulations = (state: RootState) => state[SLICE_NAME].hidden_simulations;

export const selectSelectedSimulationsWithoutHidden = createSelector(
  selectSelectedSimulations,
  selectHiddenSimulations,
  (selected, hidden) => selected.filter((id) => !hidden.includes(id)),
);

export default dataSlice.reducer;
