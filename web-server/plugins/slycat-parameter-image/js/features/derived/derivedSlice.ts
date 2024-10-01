import { createSlice, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../../store";
import _ from "lodash";

export const SLICE_NAME = "derived";

export type TableMetadataType = Readonly<{
  "row-count": number;
  "column-count": number;
  "column-names": string[];
  "column-types": ColumnTypesType[];
}>;
export type TableStatisticsType = Readonly<{
  min: number | string;
  max: number | string;
}>[];
export type ColumnTypesType = "string" | "float64" | "int64";
export type VariableAliasesType = Readonly<{
  [key: string]: string;
}>;
export type XYPairsType = Readonly<{
  x: number;
  y: number;
  label: string;
}>[];
export type ValuesType =
  | Array<string>
  | Array<number | undefined>
  | Array<Date | undefined>
  | Float64Array;
export type ThreeDColorByRangeType = Readonly<{
  [uri: string]: {
    [colorBy: string]: [number, number];
  };
}>;
export type ThreeDColorByLegendsType = Readonly<{
  [uid: string]: {
    width: number;
    height: number;
  };
}>;
export type ThreeDColorByOptionsType = Readonly<{
  [uri: string]: {
    [variableIndex: number]: Readonly<{
      label: string;
      value: string;
      type?: string;
      components?: number;
    }>;
  };
}>;

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
  three_d_colorby_range: ThreeDColorByRangeType;
  three_d_colorby_legends: ThreeDColorByLegendsType;
  three_d_colorby_options: ThreeDColorByOptionsType;
  embed: boolean;
  hideControls: boolean;
  hideTable: boolean;
  hideScatterplot: boolean;
  hideFilters: boolean;
  userRole: string;
}

export const initialState: DerivedState = {
  variableAliases: {},
  xValues: [],
  yValues: [],
  vValues: [],
  mediaValues: [],
  three_d_colorby_range: {},
  three_d_colorby_legends: {},
  three_d_colorby_options: {},
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
  embed: false,
  hideControls: false,
  hideTable: false,
  hideScatterplot: false,
  hideFilters: false,
  userRole: "",
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
      state.xValues = _.cloneDeep(action.payload);
    },
    yValuesSet: (state, action: PayloadAction<ValuesType>) => {
      state.yValues = _.cloneDeep(action.payload);
    },
    vValuesSet: (state, action: PayloadAction<ValuesType>) => {
      state.vValues = _.cloneDeep(action.payload);
    },
    mediaValuesSet: (state, action: PayloadAction<string[]>) => {
      state.mediaValues = _.cloneDeep(action.payload);
    },
    threeDColorByRangeSet: (
      state,
      action: PayloadAction<{ uri: string; colorBy: string; range: [number, number] }>,
    ) => {
      const { uri, colorBy, range } = action.payload;
      state.three_d_colorby_range[uri] = {
        ...state.three_d_colorby_range[uri],
        [colorBy]: _.cloneDeep(range),
      };
    },
    threeDColorByLegendsSet: (
      state,
      action: PayloadAction<{ uid: string; width: number; height: number }>,
    ) => {
      const { uid, width, height } = action.payload;
      state.three_d_colorby_legends[uid] = { width, height };
    },
    threeDColorByOptionsSet: (
      state,
      action: PayloadAction<{
        uri: string;
        options: { label: string; value: string; type?: string; components?: number }[];
      }>,
    ) => {
      const { uri, options } = action.payload;
      state.three_d_colorby_options[uri] = _.cloneDeep(options);
    },
    tableStatisticsSet: (state, action: PayloadAction<TableStatisticsType>) => {
      state.table_statistics = _.cloneDeep(action.payload);
    },
    tableMetadataSet: (state, action: PayloadAction<TableMetadataType>) => {
      state.table_metadata = _.cloneDeep(action.payload);
    },
    userRoleSet: (state, action: PayloadAction<string>) => {
      state.userRole = action.payload;
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
  threeDColorByRangeSet,
  threeDColorByLegendsSet,
  threeDColorByOptionsSet,
  tableStatisticsSet,
  tableMetadataSet,
  userRoleSet,
} = derivedSlice.actions;

// Selectors
export const selectVariableAliases = (state: RootState) => state[SLICE_NAME].variableAliases;
export const selectXValues = (state: RootState) => state[SLICE_NAME].xValues;
export const selectYValues = (state: RootState) => state[SLICE_NAME].yValues;
export const selectVValues = (state: RootState) => state[SLICE_NAME].vValues;
export const selectMediaValues = (state: RootState) => state[SLICE_NAME].mediaValues;
export const selectThreeDColorByRange = (state: RootState) =>
  state[SLICE_NAME].three_d_colorby_range;
export const selectThreeDColorByLegends = (state: RootState) =>
  state[SLICE_NAME].three_d_colorby_legends;
export const selectThreeDColorByOptions = (state: RootState) =>
  state[SLICE_NAME].three_d_colorby_options;
export const selectEmbed = (state: RootState) => state[SLICE_NAME].embed;
export const selectHideControls = (state: RootState) => state[SLICE_NAME].hideControls;
export const selectHideTable = (state: RootState) => state[SLICE_NAME].hideTable;
export const selectHideScatterplot = (state: RootState) => state[SLICE_NAME].hideScatterplot;
export const selectHideFilters = (state: RootState) => state[SLICE_NAME].hideFilters;
export const selectMediaColumns = (state: RootState) => state[SLICE_NAME].media_columns;
export const selectRatingVariables = (state: RootState) => state[SLICE_NAME].rating_variables;
export const selectXYPairs = (state: RootState) => state[SLICE_NAME].xy_pairs;
export const selectUserRole = (state: RootState) => state[SLICE_NAME].userRole;
export const selectTableStatistics = (state: RootState) => state[SLICE_NAME].table_statistics;
export const selectTableMetadata = (state: RootState) => state[SLICE_NAME].table_metadata;
export const selectColumnTypes = (state: RootState) =>
  state[SLICE_NAME].table_metadata["column-types"];
export const selectColumnNames = (state: RootState) =>
  state[SLICE_NAME].table_metadata["column-names"];
export default derivedSlice.reducer;
