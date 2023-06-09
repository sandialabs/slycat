import { createSelector } from "@reduxjs/toolkit";
import * as d3 from "d3v7";
import _ from "lodash";

// Constants
const X_AXIS_TICK_LABEL_HEIGHT = 40;

// Type definitions
type VariableRangesType = {
  [key: number]: {
    min: number;
    max: number;
  };
};

type ColumnTypesType = {
  [key: number]: "string" | "float64" | "int64";
};

type TableStatisticsType = {
  min: number | string;
  max: number | string;
}[];

type MinMaxType = number | string | Date | undefined;

type AxesVariablesType = {
  [key: number]: "Linear" | "Log" | "Date & Time";
};

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
const selectTableStatistics = (state) => state.derived.table_statistics;

export const selectXColumnType = createSelector(
  selectXIndex,
  selectColumnTypes,
  (x_index: number, columnTypes: ColumnTypesType): string => {
    return columnTypes[x_index] !== undefined ? columnTypes[x_index] : "";
  }
);

export const selectYColumnType = createSelector(
  selectYIndex,
  selectColumnTypes,
  (y_index: number, columnTypes: ColumnTypesType): string => {
    return columnTypes[y_index] !== undefined ? columnTypes[y_index] : "";
  }
);

export const selectVColumnType = createSelector(
  selectVIndex,
  selectColumnTypes,
  (v_index: number, columnTypes: ColumnTypesType): string => {
    return columnTypes[v_index] !== undefined ? columnTypes[v_index] : "";
  }
);

export const selectXScaleType = createSelector(
  selectXIndex,
  selectAxesVariables,
  (x_index: number, axesVariables: AxesVariablesType): string => {
    return axesVariables[x_index] !== undefined ? axesVariables[x_index] : "Linear";
  }
);

export const selectYScaleType = createSelector(
  selectYIndex,
  selectAxesVariables,
  (y_index: number, axesVariables: AxesVariablesType): string => {
    return axesVariables[y_index] !== undefined ? axesVariables[y_index] : "Linear";
  }
);

export const selectVScaleType = createSelector(
  selectVIndex,
  selectAxesVariables,
  (v_index: number, axesVariables: AxesVariablesType): string => {
    return axesVariables[v_index] !== undefined ? axesVariables[v_index] : "Linear";
  }
);

// TODO: There is probably a cleaner way of dealing with Dates using d3.
const getMinMaxValue = (
  minOrMax: "min" | "max",
  values: (number | string)[],
  variableRanges: VariableRangesType,
  index: number,
  columnTypes: ColumnTypesType,
  scaleType: string,
  tableStatistics: TableStatisticsType
): MinMaxType => {
  // For 'Date & Time' scales...
  if (scaleType == "Date & Time") {
    // If we have a custom range...
    if (variableRanges[index] !== undefined && variableRanges[index][minOrMax] !== undefined) {
      // Convert custom range to Date object, validate it, and return it if it's valid
      const date: Date = new Date(variableRanges[index][minOrMax].toString());
      if (date.toString() !== "Invalid Date") {
        return date;
      }
    }

    // Otherwise convert all values to Date objects
    let dates: Date[] = [];
    for (let value of values) {
      dates.push(new Date(value.toString()));
    }

    // If we have any valid dates, return the min/max of those
    if (dates.length > 0) {
      return d3[minOrMax](dates);
    }
    // Otherwise, return undefined
    return undefined;
  }
  // If we have a custom range, use that.
  if (variableRanges[index] !== undefined && variableRanges[index][minOrMax] !== undefined) {
    return variableRanges[index][minOrMax];
  }
  // For numeric values, use the min/max of the values from table statistics retrieved from server.
  if (columnTypes[index] != "string") {
    return tableStatistics[index][minOrMax];
  }
  return undefined;
};

export const selectXMin = createSelector(
  selectXValues,
  selectVariableRanges,
  selectXIndex,
  selectColumnTypes,
  selectXScaleType,
  selectTableStatistics,
  (
    xValues: (number | string)[],
    variableRanges: VariableRangesType,
    xIndex: number,
    columnTypes: ColumnTypesType,
    xScaleType: string,
    tableStatistics: TableStatisticsType
  ): MinMaxType => {
    return getMinMaxValue("min", xValues, variableRanges, xIndex, columnTypes, xScaleType, tableStatistics);
  }
);

export const selectXMax = createSelector(
  selectXValues,
  selectVariableRanges,
  selectXIndex,
  selectColumnTypes,
  selectXScaleType,
  selectTableStatistics,
  (
    xValues: (number | string)[],
    variableRanges: VariableRangesType,
    xIndex: number,
    columnTypes: ColumnTypesType,
    xScaleType: string,
    tableStatistics: TableStatisticsType
  ): MinMaxType => {
    return getMinMaxValue("max", xValues, variableRanges, xIndex, columnTypes, xScaleType, tableStatistics);
  }
);

export const selectYMin = createSelector(
  selectYValues,
  selectVariableRanges,
  selectYIndex,
  selectColumnTypes,
  selectYScaleType,
  selectTableStatistics,
  (
    yValues: (number | string)[],
    variableRanges: VariableRangesType,
    yIndex: number,
    columnTypes: ColumnTypesType,
    yScaleType: string,
    tableStatistics: TableStatisticsType
  ): MinMaxType => {
    return getMinMaxValue("min", yValues, variableRanges, yIndex, columnTypes, yScaleType, tableStatistics);
  }
);

export const selectYMax = createSelector(
  selectYValues,
  selectVariableRanges,
  selectYIndex,
  selectColumnTypes,
  selectYScaleType,
  selectTableStatistics,
  (
    yValues: (number | string)[],
    variableRanges: VariableRangesType,
    yIndex: number,
    columnTypes: ColumnTypesType,
    yScaleType: string,
    tableStatistics: TableStatisticsType
  ): MinMaxType => {
    return getMinMaxValue("max", yValues, variableRanges, yIndex, columnTypes, yScaleType, tableStatistics);
  }
);

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
    height - margin_bottom - X_AXIS_TICK_LABEL_HEIGHT, // Subtracting pixels to account for the height of the x-axis tick labels.
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
    height - margin_top - margin_bottom - X_AXIS_TICK_LABEL_HEIGHT,
    0,
  ]
);

export const selectXTicks = createSelector(selectXRangeCanvas, (xRangeCanvas: number[]): number => {
  return xRangeCanvas[1] / 85;
});

export const selectYTicks = createSelector(selectYRangeCanvas, (yRangeCanvas: number[]): number => {
  return yRangeCanvas[0] / 50;
});

// TODO: selectXValues and selectYValues sometimes are out of sync with the
// currently selected x variable and y variable. This is because they are
// loaded asynchronously outside of Redux. 
// It causes console erros that become fixed once x and y values are actually
// loaded. We should fix this by loading x and y values in Redux.
export const selectXScale = createSelector(
  selectXScaleType,
  selectXMin,
  selectXMax,
  selectXScaleRange,
  selectXColumnType,
  selectXValues,
  (
    xScaleType: string,
    xMin: MinMaxType,
    xMax: MinMaxType,
    xScaleRange: number[],
    xColumnType: string,
    xValues: (number | string)[]
  ): any => {
    return getScale(xScaleType, xMin, xMax, xScaleRange, xColumnType, xValues);
  }
);

export const selectYScale = createSelector(
  selectYScaleType,
  selectYMin,
  selectYMax,
  selectYScaleRange,
  selectYColumnType,
  selectYValues,
  (
    yScaleType: string,
    yMin: MinMaxType,
    yMax: MinMaxType,
    yScaleRange: number[],
    yColumnType: string,
    yValues: (number | string)[]
  ): any => {
    return getScale(yScaleType, yMin, yMax, yScaleRange, yColumnType, yValues);
  }
);

const getScale = (
  scaleType: string,
  min: MinMaxType,
  max: MinMaxType,
  scaleRange: number[],
  columnType: string,
  values: (number | string)[]
) => {
  let scale;
  switch (scaleType) {
    // Log scale types always get a log scale
    case "Log":
      scale = d3.scaleLog();
      break;
    // Date & Time scale types always get a time scale
    case "Date & Time":
      scale = d3.scaleTime();
      break;
    default:
      // For numeric values, use a linear scale.
      if (columnType !== "string") scale = d3.scaleLinear();
      // Otherwise, use a point scale (ordinal / categorical) for string values
      else scale = d3.scalePoint();
  }
  // Domain is the min and max values for numeric values or Date & Time scales,
  // otherwise the unique values for string variables.
  const domain =
    columnType === "string" && scaleType !== "Date & Time" ? _.uniq(values) : [min, max];
  return scale.range(scaleRange).domain(domain);
};
