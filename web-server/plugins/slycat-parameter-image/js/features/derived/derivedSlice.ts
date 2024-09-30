import { createSlice, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../../store";
import _ from "lodash";

export const SLICE_NAME = "derivedNew";

export type TableMetadataType = {
  "row-count": number;
  "column-count": number;
  "column-names": string[];
  "column-types": ColumnTypesType[];
};

export type TableStatisticsType = {
  min: number | string;
  max: number | string;
}[];

export type ColumnTypesType = "string" | "float64" | "int64";

export type VariableAliasesType = {
  [key: string]: string;
};

export type XYPairsType = {
  x: number;
  y: number;
  label: string;
}[];
export type ValuesType =
  | Array<string>
  | Array<number | undefined>
  | Array<Date | undefined>
  | Float64Array;

export interface DerivedState {
  xValues: ValuesType;
  yValues: ValuesType;
  vValues: ValuesType;
  table_metadata: TableMetadataType;
  table_statistics: TableStatisticsType;
  variableAliases: VariableAliasesType;
  mediaValues: string[];
  media_columns: number[];
  rating_variables: number[];
  xy_pairs: XYPairsType;
  // ToDo: Add more specific types for these
  three_d_colorby_range: {};
  three_d_colorby_legends: {};
}

export const initialState: DerivedState = {
  variableAliases: {},
  xValues: [],
  yValues: [],
  vValues: [],
  mediaValues: [],
  three_d_colorby_range: {},
  three_d_colorby_legends: {},
  media_columns: [],
  rating_variables: [],
  xy_pairs: [],
  table_metadata: {
    "row-count": 0,
    "column-count": 0,
    "column-names": [],
    "column-types": [],
  },
  table_statistics: [],
};

export const derivedSlice = createSlice({
  name: SLICE_NAME,
  initialState,
  reducers: {
    variableAliasChanged: (state, action: PayloadAction<VariableAliasesType>) => {
      const { aliasVariable, aliasLabel } = action.payload;
      state.variableAliases[aliasVariable] = aliasLabel;
    },
    variableAliasRemoved: (state, action: PayloadAction<VariableAliasesType>) => {
      const { aliasVariable, aliasLabel } = action.payload;
      delete state.variableAliases[aliasVariable];
    },
    variableAliasesAllRemoved: (state) => {
      state.variableAliases = {};
    },
    xValuesSet: (state, action: PayloadAction<ValuesType>) => {
      state.xValues = action.payload;
    },
    yValuesSet: (state, action: PayloadAction<ValuesType>) => {
      state.yValues = action.payload;
    },
    vValuesSet: (state, action: PayloadAction<ValuesType>) => {
      state.vValues = action.payload;
    },
    mediaValuesSet: (state, action: PayloadAction<string[]>) => {
      state.mediaValues = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  variableAliasChanged,
  variableAliasRemoved,
  variableAliasesAllRemoved,
  xValuesSet,
  yValuesSet,
  vValuesSet,
  mediaValuesSet,
} = derivedSlice.actions;

// Selectors
export const selectVariableAliases = (state: RootState) => state[SLICE_NAME].variableAliases;
export const selectXValues = (state: RootState) => state[SLICE_NAME].xValues;
export const selectYValues = (state: RootState) => state[SLICE_NAME].yValues;
export const selectVValues = (state: RootState) => state[SLICE_NAME].vValues;
export const selectMediaValues = (state: RootState) => state[SLICE_NAME].mediaValues;
export default derivedSlice.reducer;
