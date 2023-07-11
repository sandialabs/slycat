import { createSelector } from "@reduxjs/toolkit";
import * as d3 from "d3v7";
import _ from "lodash";
import { selectScatterplotPaneWidth, selectScatterplotPaneHeight } from "./scatterplotSlice";
import {
  RootState,
  VariableRangesType,
  TableStatisticsType,
  AxesVariablesType,
  ColumnTypesType,
  ValuesType,
} from "./store";

// Constants
const X_AXIS_TICK_LABEL_HEIGHT = 40;

// Type definitions
type MinMaxType = number | string | Date | undefined;
type ExtentType = [MinMaxType, MinMaxType];
export type ScaleRangeType = [number, number];

const selectMarginLeft = (state: RootState) => state.scatterplot_margin.left;
const selectMarginRight = (state: RootState) => state.scatterplot_margin.right;
const selectMarginTop = (state: RootState) => state.scatterplot_margin.top;
const selectMarginBottom = (state: RootState) => state.scatterplot_margin.bottom;
export const selectXValues = (state: RootState) => state.derived.xValues;
export const selectYValues = (state: RootState) => state.derived.yValues;
const selectVariableRanges = (state: RootState) => state.variableRanges;
export const selectColormap = (state: RootState) => state.colormap;
export const selectXIndex = (state: RootState) => state.x_index;
export const selectYIndex = (state: RootState) => state.y_index;
export const selectVIndex = (state: RootState) => state.v_index;
export const selectAxesVariables = (state: RootState) => state.axesVariables;
const selectColumnTypes = (state: RootState) => state.derived.table_metadata["column-types"];
const selectColumnNames = (state: RootState) => state.derived.table_metadata["column-names"];
const selectVariableAliases = (state: RootState) => state.derived.variableAliases;
const selectTableStatistics = (state: RootState) => state.derived.table_statistics;
export const selectHiddenSimulations = (state: RootState) => state.hidden_simulations;

export const selectXValuesWithoutHidden = createSelector(
  selectXValues,
  selectHiddenSimulations,
  (xValues: ValuesType, hiddenSimulations: number[]): ValuesType => {
    return xValues.filter((value, index) => !hiddenSimulations.includes(index));
  },
);

export const selectVariableLabels = createSelector(
  selectColumnNames,
  selectVariableAliases,
  (columnNames, variableAliases) => {
    return columnNames.map((columnName, index) => {
      return variableAliases?.[index] ?? columnName;
    });
  },
);

export const selectXColumnName = createSelector(
  selectXIndex,
  selectVariableLabels,
  (x_index: number, variableLabels): string => {
    return variableLabels?.[x_index] ?? "";
  },
);

export const selectYColumnName = createSelector(
  selectYIndex,
  selectVariableLabels,
  (y_index: number, variableLabels): string => {
    return variableLabels?.[y_index] ?? "";
  },
);

export const selectVColumnName = createSelector(
  selectVIndex,
  selectVariableLabels,
  (v_index: number, variableLabels): string => {
    return variableLabels?.[v_index] ?? "";
  },
);

export const selectXColumnType = createSelector(
  selectXIndex,
  selectColumnTypes,
  (x_index: number, columnTypes): string => {
    return columnTypes?.[x_index] ?? "";
  },
);

export const selectYColumnType = createSelector(
  selectYIndex,
  selectColumnTypes,
  (y_index: number, columnTypes): string => {
    return columnTypes?.[y_index] ?? "";
  },
);

export const selectVColumnType = createSelector(
  selectVIndex,
  selectColumnTypes,
  (v_index: number, columnTypes): string => {
    return columnTypes?.[v_index] ?? "";
  },
);

export const selectXScaleType = createSelector(
  selectXIndex,
  selectAxesVariables,
  (x_index: number, axesVariables: AxesVariablesType): string => {
    return axesVariables?.[x_index] ?? "Linear";
  },
);

export const selectYScaleType = createSelector(
  selectYIndex,
  selectAxesVariables,
  (y_index: number, axesVariables: AxesVariablesType): string => {
    return axesVariables?.[y_index] ?? "Linear";
  },
);

export const selectVScaleType = createSelector(
  selectVIndex,
  selectAxesVariables,
  (v_index: number, axesVariables: AxesVariablesType): string => {
    return axesVariables?.[v_index] ?? "Linear";
  },
);

const getExtent = (
  values: ValuesType,
  variableRanges: VariableRangesType,
  index: number,
  columnTypes: ColumnTypesType[],
  scaleType: string,
  tableStatistics: TableStatisticsType,
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
    xValues,
    variableRanges: VariableRangesType,
    xIndex: number,
    columnTypes,
    xScaleType: string,
    tableStatistics: TableStatisticsType,
  ): ExtentType => {
    return getExtent(xValues, variableRanges, xIndex, columnTypes, xScaleType, tableStatistics);
  },
);

const selectYExtent = createSelector(
  selectYValues,
  selectVariableRanges,
  selectYIndex,
  selectColumnTypes,
  selectYScaleType,
  selectTableStatistics,
  (
    yValues,
    variableRanges: VariableRangesType,
    yIndex: number,
    columnTypes,
    yScaleType: string,
    tableStatistics: TableStatisticsType,
  ): ExtentType => {
    return getExtent(yValues, variableRanges, yIndex, columnTypes, yScaleType, tableStatistics);
  },
);

// Returns the start and end of the scatterplot x-axis area relative
// to the entire width of the scatterplot pane by adjusting for left and right margins.
export const selectXScaleRange = createSelector(
  selectMarginLeft,
  selectMarginRight,
  selectScatterplotPaneWidth,
  (margin_left: number, margin_right: number, width: number): ScaleRangeType => [
    0 + margin_left,
    width - margin_right,
  ],
);

// Returns the start and end of the scatterplot y-axis area relative
// to the entire height of the scatterplot pane by adjusting for top and bottom margins.
export const selectYScaleRange = createSelector(
  selectMarginTop,
  selectMarginBottom,
  selectScatterplotPaneHeight,
  (margin_top: number, margin_bottom: number, height: number): ScaleRangeType => [
    height - margin_bottom - X_AXIS_TICK_LABEL_HEIGHT, // Subtracting pixels to account for the height of the x-axis tick labels.
    0 + margin_top,
  ],
);

// Returns the start and end of the scatterplot x-axis area in absolute pixel values.
export const selectXRangeCanvas = createSelector(
  selectMarginLeft,
  selectMarginRight,
  selectScatterplotPaneWidth,
  (margin_left: number, margin_right: number, width: number): ScaleRangeType => [
    0,
    width - margin_left - margin_right,
  ],
);

// Returns the start and end of the scatterplot y-axis area in absolute pixel values.
export const selectYRangeCanvas = createSelector(
  selectMarginTop,
  selectMarginBottom,
  selectScatterplotPaneHeight,
  (margin_top: number, margin_bottom: number, height: number): ScaleRangeType => [
    height - margin_top - margin_bottom - X_AXIS_TICK_LABEL_HEIGHT,
    0,
  ],
);

export const selectXTicks = createSelector(
  selectXRangeCanvas,
  (xRangeCanvas: ScaleRangeType): number => {
    return xRangeCanvas[1] / 85;
  },
);

export const selectYTicks = createSelector(
  selectYRangeCanvas,
  (yRangeCanvas: ScaleRangeType): number => {
    return yRangeCanvas[0] / 50;
  },
);

export type SlycatScaleType =
  | d3.ScaleLinear<number, number>
  | d3.ScaleLogarithmic<number, number>
  | d3.ScaleTime<number, number>
  | d3.ScalePoint<string>;

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
    xValues,
  ): SlycatScaleType => {
    return getScale(xScaleType, xExtent, xScaleRange, xColumnType, xValues);
  },
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
    yValues,
  ): SlycatScaleType => {
    return getScale(yScaleType, yExtent, yScaleRange, yColumnType, yValues);
  },
);

const getScale = (
  scaleType: string,
  extent: ExtentType,
  scaleRange: ScaleRangeType,
  columnType: string,
  values: ValuesType,
): SlycatScaleType => {
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

// Vertical and horizontal offsets of the x-axis label.
export const X_LABEL_VERTICAL_OFFSET = 5;
export const X_LABEL_HORIZONTAL_OFFSET = 40;

// This is the x position of the x-axis label. Set to align with the end of the axis.
export const selectXLabelX = createSelector(
  selectXScaleRange,
  (xScaleRange: ScaleRangeType): number => xScaleRange[1] + X_LABEL_HORIZONTAL_OFFSET,
);

// Vertical offset of the y-axis label.
export const Y_LABEL_HORIZONTAL_OFFSET = 25;

// This is the y position of the y-axis label. Set to align with the middle of the axis.
export const selectYLabelY = createSelector(
  selectScatterplotPaneHeight,
  selectMarginTop,
  (scatterplot_height: number, margin_top: number): number => margin_top + scatterplot_height / 2,
);

// Checks if x-axis has a custom range defined.
export const selectXHasCustomRange = createSelector(
  selectVariableRanges,
  selectXIndex,
  (variableRanges: VariableRangesType, xIndex: number): boolean => {
    return variableRanges?.[xIndex] !== undefined;
  },
);

// Checks if y-axis has a custom range defined.
export const selectYHasCustomRange = createSelector(
  selectVariableRanges,
  selectYIndex,
  (variableRanges: VariableRangesType, yIndex: number): boolean => {
    return variableRanges?.[yIndex] !== undefined;
  },
);

// Checks if v-axis has a custom range defined.
export const selectVHasCustomRange = createSelector(
  selectVariableRanges,
  selectVIndex,
  (variableRanges: VariableRangesType, vIndex: number): boolean => {
    return variableRanges?.[vIndex] !== undefined;
  },
);
