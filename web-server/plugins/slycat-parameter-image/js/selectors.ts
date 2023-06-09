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

type ExtentType = [MinMaxType, MinMaxType];

type AxesVariablesType = {
  [key: number]: "Linear" | "Log" | "Date & Time";
};

type ValuesType = (number | string)[];

type ScaleRangeType = [number, number];

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

const getExtent = (
  values: ValuesType,
  variableRanges: VariableRangesType,
  index: number,
  columnTypes: ColumnTypesType,
  scaleType: string,
  tableStatistics: TableStatisticsType
): ExtentType => {
  const extent: ExtentType = [undefined, undefined];

  switch (scaleType) {
    // For 'Date & Time' scales...
    case "Date & Time":
      // Convert all values to Date objects
      const dates = values.map((value) => new Date(value.toString()));

      extent[0] = d3.min(dates);
      extent[1] = d3.max(dates);

      // If we have a custom range, try to use that instead.
      const customRange = variableRanges[index];
      if (customRange?.min !== undefined) {
        const minDate = new Date(customRange.min.toString());
        if (minDate.toString() !== "Invalid Date") {
          extent[0] = minDate;
        }
      }
      if (customRange?.max !== undefined) {
        const maxDate = new Date(customRange.max.toString());
        if (maxDate.toString() !== "Invalid Date") {
          extent[1] = maxDate;
        }
      }

      return extent;

    // For all other scales...
    default:
      switch (columnTypes[index]) {
        // For string values, just return the min/max of the values.
        case "string":
          extent[0] = d3.min(values);
          extent[1] = d3.max(values);
          break;

        // For numeric values...
        default:
          // Use the min/max of the values from table statistics retrieved from server.
          const { min, max } = tableStatistics[index] || {};
          extent[0] = min;
          extent[1] = max;

          // If we have a custom range, use that instead.
          const customRange = variableRanges[index];
          if (customRange?.min !== undefined) {
            extent[0] = customRange.min;
          }
          if (customRange?.max !== undefined) {
            extent[1] = customRange.max;
          }
          break;
      }
      return extent;
  }
};

const selectXExtent = createSelector(
  selectXValues,
  selectVariableRanges,
  selectXIndex,
  selectColumnTypes,
  selectXScaleType,
  selectTableStatistics,
  (
    xValues: ValuesType,
    variableRanges: VariableRangesType,
    xIndex: number,
    columnTypes: ColumnTypesType,
    xScaleType: string,
    tableStatistics: TableStatisticsType
  ): ExtentType => {
    return getExtent(xValues, variableRanges, xIndex, columnTypes, xScaleType, tableStatistics);
  }
);

const selectYExtent = createSelector(
  selectYValues,
  selectVariableRanges,
  selectYIndex,
  selectColumnTypes,
  selectYScaleType,
  selectTableStatistics,
  (
    yValues: ValuesType,
    variableRanges: VariableRangesType,
    yIndex: number,
    columnTypes: ColumnTypesType,
    yScaleType: string,
    tableStatistics: TableStatisticsType
  ): ExtentType => {
    return getExtent(yValues, variableRanges, yIndex, columnTypes, yScaleType, tableStatistics);
  }
);

// Returns the start and end of the scatterplot x-axis area relative
// to the entire width of the scatterplot pane by adjusting for left and right margins.
export const selectXScaleRange = createSelector(
  selectMarginLeft,
  selectMarginRight,
  selectWidth,
  (margin_left: number, margin_right: number, width: number): ScaleRangeType => [
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
  (margin_top: number, margin_bottom: number, height: number): ScaleRangeType => [
    height - margin_bottom - X_AXIS_TICK_LABEL_HEIGHT, // Subtracting pixels to account for the height of the x-axis tick labels.
    0 + margin_top,
  ]
);

// Returns the start and end of the scatterplot x-axis area in absolute pixel values.
export const selectXRangeCanvas = createSelector(
  selectMarginLeft,
  selectMarginRight,
  selectWidth,
  (margin_left: number, margin_right: number, width: number): ScaleRangeType => [
    0,
    width - margin_left - margin_right,
  ]
);

// Returns the start and end of the scatterplot y-axis area in absolute pixel values.
export const selectYRangeCanvas = createSelector(
  selectMarginTop,
  selectMarginBottom,
  selectHeight,
  (margin_top: number, margin_bottom: number, height: number): ScaleRangeType => [
    height - margin_top - margin_bottom - X_AXIS_TICK_LABEL_HEIGHT,
    0,
  ]
);

export const selectXTicks = createSelector(selectXRangeCanvas, (xRangeCanvas: ScaleRangeType): number => {
  return xRangeCanvas[1] / 85;
});

export const selectYTicks = createSelector(selectYRangeCanvas, (yRangeCanvas: ScaleRangeType): number => {
  return yRangeCanvas[0] / 50;
});

// TODO: selectXValues and selectYValues sometimes are out of sync with the
// currently selected x variable and y variable. This is because they are
// loaded asynchronously outside of Redux.
// It causes console erros that become fixed once x and y values are actually
// loaded. We should fix this by loading x and y values in Redux.
export const selectXScale = createSelector(
  selectXScaleType,
  selectXExtent,
  selectXScaleRange,
  selectXColumnType,
  selectXValues,
  (
    xScaleType: string,
    xExtent: ExtentType,
    xScaleRange: ScaleRangeType,
    xColumnType: string,
    xValues: ValuesType
  ): any => {
    return getScale(xScaleType, xExtent, xScaleRange, xColumnType, xValues);
  }
);

export const selectYScale = createSelector(
  selectYScaleType,
  selectYExtent,
  selectYScaleRange,
  selectYColumnType,
  selectYValues,
  (
    yScaleType: string,
    yExtent: ExtentType,
    yScaleRange: ScaleRangeType,
    yColumnType: string,
    yValues: ValuesType
  ): any => {
    return getScale(yScaleType, yExtent, yScaleRange, yColumnType, yValues);
  }
);

const getScale = (
  scaleType: string,
  extent: ExtentType,
  scaleRange: ScaleRangeType,
  columnType: string,
  values: ValuesType
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
  const domain = columnType === "string" && scaleType !== "Date & Time" ? _.uniq(values) : extent;
  return scale.range(scaleRange).domain(domain);
};
