import { createSlice, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";
import _ from "lodash";

export const SLICE_NAME = "data";

export interface DataState {
  selected_simulations: number[];
  hidden_simulations: number[];
  v_indices: number[];
  cluster_index: number;
}

export const initialState: DataState = {
  selected_simulations: [],
  hidden_simulations: [],
  v_indices: [],
  cluster_index: 0,
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
    setVIndex: (state, action: PayloadAction<{ clusterIndex: number; value: number }>) => {
      const { clusterIndex, value } = action.payload;
      while (state.v_indices.length <= clusterIndex) {
        state.v_indices.push(0);
      }
      state.v_indices[clusterIndex] = value;
    },
    initializeVIndices: (state, action: PayloadAction<number>) => {
      const numClusters = action.payload;
      state.v_indices = new Array(numClusters).fill(0);
    },
    setClusterIndex: (state, action: PayloadAction<number>) => {
      state.cluster_index = action.payload;
    },
    setCurrentVIndex: (state, action: PayloadAction<number>) => {
      while (state.v_indices.length <= state.cluster_index) {
        state.v_indices.push(0);
      }
      state.v_indices[state.cluster_index] = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setSelectedSimulations,
  setHiddenSimulations,
  setVIndex,
  initializeVIndices,
  setClusterIndex,
  setCurrentVIndex,
} = dataSlice.actions;

// Selectors
export const selectSelectedSimulations = (state: RootState) =>
  state[SLICE_NAME].selected_simulations;

export const selectHiddenSimulations = (state: RootState) => state[SLICE_NAME].hidden_simulations;

export const selectSelectedSimulationsWithoutHidden = createSelector(
  selectSelectedSimulations,
  selectHiddenSimulations,
  (selected, hidden) => selected.filter((id: number) => !hidden.includes(id)),
);

export const selectVIndex = (state: RootState, clusterIndex: number) =>
  state[SLICE_NAME].v_indices[clusterIndex] ?? 0;

export const selectVIndices = (state: RootState) => state[SLICE_NAME].v_indices;

export const selectClusterIndex = (state: RootState) => state[SLICE_NAME].cluster_index;

export const selectCurrentVIndex = createSelector(
  selectClusterIndex,
  selectVIndices,
  (clusterIndex, vIndices) => vIndices[clusterIndex] ?? 0,
);

export default dataSlice.reducer;
