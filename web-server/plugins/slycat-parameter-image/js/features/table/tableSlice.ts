import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../../store";

export const SLICE_NAME = "table";

export interface TableState {
  table_pane_width: number;
  table_pane_height: number;
  sort_variable: number | null;
  sort_order: string | null;
}

export const initialState: TableState = {
  table_pane_width: 0,
  table_pane_height: 0,
  sort_variable: null,
  sort_order: null,
};

export const tableSlice = createSlice({
  name: SLICE_NAME,
  initialState,
  reducers: {
    setTablePaneWidth: (state, action: PayloadAction<number>) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      state.table_pane_width = action.payload;
    },
    setTablePaneHeight: (state, action: PayloadAction<number>) => {
      state.table_pane_height = action.payload;
    },
    setSortVariable: (state, action: PayloadAction<number>) => {
      state.sort_variable = action.payload;
    },
    setSortOrder: (state, action: PayloadAction<string>) => {
      state.sort_order = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { setTablePaneWidth, setTablePaneHeight } = tableSlice.actions;

// Selectors
export const selectTablePaneWidth = (state: RootState) => state[SLICE_NAME].table_pane_width;
export const selectTablePaneHeight = (state: RootState) => state[SLICE_NAME].table_pane_height;
export const selectSortVariable = (state: RootState) => state[SLICE_NAME].sort_variable;
export const selectSortOrder = (state: RootState) => state[SLICE_NAME].sort_order;

export default tableSlice.reducer;
