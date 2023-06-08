import { createSelector } from "@reduxjs/toolkit";
import * as d3 from "d3v7";

const selectMarginLeft = (state) => state.scatterplot_margin.left;
const selectMarginRight = (state) => state.scatterplot_margin.right;
const selectMarginTop = (state) => state.scatterplot_margin.top;
const selectMarginBottom = (state) => state.scatterplot_margin.bottom;
const selectWidth = (state) => state.ui.scatterplot_pane_width;
const selectHeight = (state) => state.ui.scatterplot_pane_height;
export const selectXValues = (state) => state.derived.xValues;
export const selectYValues = (state) => state.derived.yValues;
const selectVariableRanges = (state) => state.variableRanges;
export const selectColormap = (state) => state.colormap;
export const selectXIndex = (state) => state.x_index;
export const selectYIndex = (state) => state.y_index;
export const selectVIndex = (state) => state.v_index;
export const selectAxesVariables = (state) => state.axesVariables;
const selectColumnTypes = (state) => state.derived.table_metadata["column-types"];

type VariableRanges = {
  [key: number]: {
    min: number;
    max: number;
  };
};

type ColumnTypes = {
  [key: number]: "string" | "float64" | "int64";
};

const getMinMaxValue = (
  minOrMax: "min" | "max",
  values: (number | string)[],
  variableRanges: VariableRanges,
  index: number,
  columnTypes: ColumnTypes
): number | undefined => {
  if (variableRanges[index] !== undefined && variableRanges[index][minOrMax] !== undefined) {
    return variableRanges[index].min;
  }
  if (columnTypes[index] != "string" && values.length > 0) {
    return d3[minOrMax](values);
  }
  return undefined;
};

export const selectXMin = createSelector(
  selectXValues,
  selectVariableRanges,
  selectXIndex,
  selectColumnTypes,
  (
    xValues: (number | string)[],
    variableRanges: VariableRanges,
    xIndex: number,
    columnTypes: ColumnTypes
  ): number | undefined => {
    return getMinMaxValue("min", xValues, variableRanges, xIndex, columnTypes);
  }
);

export const selectXMax = createSelector(
  selectXValues,
  selectVariableRanges,
  selectXIndex,
  selectColumnTypes,
  (
    xValues: (number | string)[],
    variableRanges: VariableRanges,
    xIndex: number,
    columnTypes: ColumnTypes
  ): number | undefined => {
    return getMinMaxValue("max", xValues, variableRanges, xIndex, columnTypes);
  }
);

export const selectYMin = createSelector(
  selectYValues,
  selectVariableRanges,
  selectYIndex,
  selectColumnTypes,
  (
    yValues: (number | string)[],
    variableRanges: VariableRanges,
    yIndex: number,
    columnTypes: ColumnTypes
  ): number | undefined => {
    return getMinMaxValue("min", yValues, variableRanges, yIndex, columnTypes);
  }
);

export const selectYMax = createSelector(
  selectYValues,
  selectVariableRanges,
  selectYIndex,
  selectColumnTypes,
  (
    yValues: (number | string)[],
    variableRanges: VariableRanges,
    yIndex: number,
    columnTypes: ColumnTypes
  ): number | undefined => {
    return getMinMaxValue("max", yValues, variableRanges, yIndex, columnTypes);
  }
);

const xAxisTickLabelHeight = 40;

// Returns the start and end of the scatterplot x-axis area relative
// to the entire width of the scatterplot pane by adjusting for left and right margins.
export const selectXScaleRange = createSelector(
  selectMarginLeft,
  selectMarginRight,
  selectWidth,
  (margin_left: number, margin_right: number, width: number): number[] => [
    0 + margin_left,
    width - margin_right,
  ]
);

// Returns the start and end of the scatterplot y-axis area relative
// to the entire height of the scatterplot pane by adjusting for top and bottom margins.
export const selectYScaleRange = createSelector(
  selectMarginTop,
  selectMarginBottom,
  selectHeight,
  (margin_top: number, margin_bottom: number, height: number): number[] => [
    height - margin_bottom - xAxisTickLabelHeight, // Subtracting pixels to account for the height of the x-axis tick labels.
    0 + margin_top,
  ]
);

// Returns the start and end of the scatterplot x-axis area in absolute pixel values.
export const selectXRangeCanvas = createSelector(
  selectMarginLeft,
  selectMarginRight,
  selectWidth,
  (margin_left: number, margin_right: number, width: number): number[] => [
    0,
    width - margin_left - margin_right,
  ]
);

// Returns the start and end of the scatterplot y-axis area in absolute pixel values.
export const selectYRangeCanvas = createSelector(
  selectMarginTop,
  selectMarginBottom,
  selectHeight,
  (margin_top: number, margin_bottom: number, height: number): number[] => [
    height - margin_top - margin_bottom - xAxisTickLabelHeight,
    0,
  ]
);

type AxesVariables = {
  [key: number]: "Linear" | "Log" | "Date & Time";
};

export const selectXScaleType = createSelector(
  selectXIndex,
  selectAxesVariables,
  (x_index: number, axesVariables: AxesVariables): string => {
    return axesVariables[x_index] !== undefined ? axesVariables[x_index] : "Linear";
  }
);

export const selectYScaleType = createSelector(
  selectYIndex,
  selectAxesVariables,
  (y_index: number, axesVariables: AxesVariables): string => {
    return axesVariables[y_index] !== undefined ? axesVariables[y_index] : "Linear";
  }
);

export const selectVScaleType = createSelector(
  selectVIndex,
  selectAxesVariables,
  (v_index: number, axesVariables: AxesVariables): string => {
    return axesVariables[v_index] !== undefined ? axesVariables[v_index] : "Linear";
  }
);
