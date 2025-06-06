import { createSelector } from "@reduxjs/toolkit";
import * as d3 from "d3v7";
import _ from "lodash";
import {
  selectScatterplotPaneWidth,
  selectScatterplotPaneHeight,
  selectShowHistogram,
  selectHideLabels,
  selectHorizontalSpacing,
  selectVerticalSpacing,
  selectAutoScale,
} from "./scatterplotSlice";
import { selectHiddenSimulations } from "./dataSlice";
import {
  RootState,
  VariableRangesType,
  TableStatisticsType,
  AxesVariablesType,
  ValuesType,
} from "./store";
import { ColumnTypesType } from "types/slycat";
import { parseDate } from "js/slycat-dates";

// Constants
const X_AXIS_TICK_LABEL_HEIGHT = 40;
const X_AXIS_MIN_WIDTH = 100;
const Y_AXIS_MIN_HEIGHT = 100;

// Type definitions
type MinMaxType = number | string | Date | undefined;
type ExtentType = [MinMaxType, MinMaxType];
export type ScaleRangeType = [number, number];
export type ValueIndexType = { value: string | number; index: number };

export const selectScatterplotMarginLeft = (state: RootState) => state.scatterplot_margin.left;
export const selectScatterplotMarginRight = (state: RootState) => state.scatterplot_margin.right;
export const selectScatterplotMarginTop = (state: RootState) => state.scatterplot_margin.top;
export const selectScatterplotMarginBottom = (state: RootState) => state.scatterplot_margin.bottom;
export const selectXValues = (state: RootState) => state.derived.xValues;
export const selectYValues = (state: RootState) => state.derived.yValues;
export const selectVValues = (state: RootState) => state.derived.vValues;
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

export const selectXColumnType = createSelector(
  selectXIndex,
  selectColumnTypes,
  (x_index: number, columnTypes): string | undefined => {
    return columnTypes?.[x_index];
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

// xValues can be either a Float64Array or a string array or a number array.
// So convert it to a normal array.
export const selectXValuesArray = createSelector(selectXValues, (xValues): any[] => {
  return Array.from(xValues);
});

export const selectYValuesArray = createSelector(selectYValues, (yValues): any[] => {
  return Array.from(yValues);
});

export const selectVValuesArray = createSelector(selectVValues, (vValues): any[] => {
  return Array.from(vValues);
});

export const selectXValuesLog = createSelector(
  selectXValuesArray,
  selectXColumnType,
  (xValues, selectXColumnType): string[] | (number | undefined)[] => {
    // If xValues is a string array, return it as is.
    if (selectXColumnType === "string") return xValues;

    // Otherwise, check that each value is a number and that it is positive and return the log of each value.
    return xValues.map((value) => {
      const number = Number(value);
      if (isNaN(number) || number <= 0) return undefined;
      return Math.log10(number);
    });
  },
);

export const selectXValuesDate = createSelector(
  selectXValuesArray,
  (xValues): (Date | undefined)[] => {
    return convertValuesToDateObjects(xValues);
  },
);

export const selectYValuesDate = createSelector(
  selectYValuesArray,
  (yValues): (Date | undefined)[] => {
    return convertValuesToDateObjects(yValues);
  },
);

export const selectVValuesDate = createSelector(
  selectVValuesArray,
  (vValues): (Date | undefined)[] => {
    return convertValuesToDateObjects(vValues);
  },
);

function convertValuesToDateObjects(valuesArray: any[]): (Date | undefined)[] {
  return valuesArray.map((value) => {
    // Try to convert to a data object and return it. Otherwise return undefined.
    const date = parseDate(value.toString());
    if (isNaN(date.valueOf())) return undefined;
    return date;
  });
}

function convertValuesToIndexedObjects(valuesArray: any[]): { value: any; index: number }[] {
  return valuesArray.map((value, index) => ({ value: value, index: index }));
}

function removeHiddenSimulations(valuesAndIndexes: any[], hiddenSimulations: number[]): any[] {
  return valuesAndIndexes.filter((value, index) => !hiddenSimulations.includes(index));
}

export const selectXValuesAndIndexes = createSelector(
  selectXValuesArray,
  (xValuesArray): ValueIndexType[] => {
    return convertValuesToIndexedObjects(xValuesArray);
  },
);

export const selectXValuesLogAndIndexes = createSelector(
  selectXValuesLog,
  (xValuesLogArray): ValueIndexType[] => {
    return convertValuesToIndexedObjects(xValuesLogArray);
  },
);
export const selectXValuesDateAndIndexes = createSelector(
  selectXValuesDate,
  (xValuesDateArray): ValueIndexType[] => {
    return convertValuesToIndexedObjects(xValuesDateArray);
  },
);

export const selectXValuesWithoutHidden = createSelector(
  selectXValuesArray,
  selectHiddenSimulations,
  (xValues: any[], hiddenSimulations: number[]): ValuesType => {
    // Removing hidden simulations from xValues.
    return removeHiddenSimulations(xValues, hiddenSimulations);
  },
);

export const selectYValuesWithoutHidden = createSelector(
  selectYValuesArray,
  selectHiddenSimulations,
  (yValuesArray: any[], hiddenSimulations: number[]): ValuesType => {
    // Removing hidden simulations from yValues.
    return removeHiddenSimulations(yValuesArray, hiddenSimulations);
  },
);

export const selectVValuesWithoutHidden = createSelector(
  selectVValuesArray,
  selectHiddenSimulations,
  (vValuesArray: any[], hiddenSimulations: number[]): ValuesType => {
    // Removing hidden simulations from vValues.
    return removeHiddenSimulations(vValuesArray, hiddenSimulations);
  },
);

export const selectXValuesDateWithoutHidden = createSelector(
  selectXValuesDate,
  selectHiddenSimulations,
  (xValuesDate, hiddenSimulations): (Date | undefined)[] => {
    // Removing hidden simulations from xValuesDate.
    return removeHiddenSimulations(xValuesDate, hiddenSimulations);
  },
);

export const selectYValuesDateWithoutHidden = createSelector(
  selectYValuesDate,
  selectHiddenSimulations,
  (yValuesDate, hiddenSimulations): (Date | undefined)[] => {
    // Removing hidden simulations from yValuesDate.
    return removeHiddenSimulations(yValuesDate, hiddenSimulations);
  },
);

export const selectVValuesDateWithoutHidden = createSelector(
  selectVValuesDate,
  selectHiddenSimulations,
  (vValuesDate, hiddenSimulations): (Date | undefined)[] => {
    // Removing hidden simulations from vValuesDate.
    return removeHiddenSimulations(vValuesDate, hiddenSimulations);
  },
);

export const selectXValuesAndIndexesWithoutHidden = createSelector(
  selectXValuesAndIndexes,
  selectHiddenSimulations,
  (xValuesAndIndexes, hiddenSimulations): ValueIndexType[] => {
    // Removing hidden simulations from xValuesAndIndexes.
    return removeHiddenSimulations(xValuesAndIndexes, hiddenSimulations);
  },
);

export const selectXValuesLogAndIndexesWithoutHidden = createSelector(
  selectXValuesLogAndIndexes,
  selectHiddenSimulations,
  (xValuesLogAndIndexes, hiddenSimulations): ValueIndexType[] => {
    // Removing hidden simulations from xValuesAndIndexes.
    return removeHiddenSimulations(xValuesLogAndIndexes, hiddenSimulations);
  },
);

export const selectXValuesDateAndIndexesWithoutHidden = createSelector(
  selectXValuesDateAndIndexes,
  selectHiddenSimulations,
  (xValuesDateAndIndexes, hiddenSimulations): ValueIndexType[] => {
    // Removing hidden simulations from xValuesDateAndIndexes.
    return removeHiddenSimulations(xValuesDateAndIndexes, hiddenSimulations);
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
  valuesWithoutHidden: ValuesType,
  valuesDate: (Date | undefined)[],
  valuesDateWithoutHidden: (Date | undefined)[],
  variableRanges: VariableRangesType,
  index: number,
  columnTypes: ColumnTypesType[],
  scaleType: string,
  autoScale: boolean,
): ExtentType => {
  // If selectAutoScale is true, use values without hidden simulations.
  const values_date = autoScale ? valuesDateWithoutHidden : valuesDate;
  const values_not_date = autoScale ? valuesWithoutHidden : values;
  // If we have Date & Time values, use the Date & Time extent.
  const values_for_extent = scaleType === "Date & Time" ? values_date : values_not_date;

  const extent: ExtentType = [undefined, undefined];

  switch (scaleType) {
    // For 'Date & Time' scales...
    case "Date & Time":
      extent[0] = d3.min(values_for_extent);
      extent[1] = d3.max(values_for_extent);

      // If we have a custom range, try to use that instead.
      const customRange = variableRanges[index];
      if (customRange?.min !== undefined) {
        const minDate = parseDate(customRange.min.toString());
        if (!isNaN(minDate.valueOf())) {
          extent[0] = minDate;
        }
      }
      if (customRange?.max !== undefined) {
        const maxDate = parseDate(customRange.max.toString());
        if (!isNaN(maxDate.valueOf())) {
          extent[1] = maxDate;
        }
      }

      return extent;

    // For all other scales...
    default:
      switch (columnTypes[index]) {
        // For string values, just return the min/max of the values.
        case "string":
          extent[0] = d3.min(values_for_extent);
          extent[1] = d3.max(values_for_extent);
          break;

        // For numeric values...
        default:
          extent[0] = d3.min(values_for_extent);
          extent[1] = d3.max(values_for_extent);

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

export const selectXExtent = createSelector(
  selectXValues,
  selectXValuesWithoutHidden,
  selectXValuesDate,
  selectXValuesDateWithoutHidden,
  selectVariableRanges,
  selectXIndex,
  selectColumnTypes,
  selectXScaleType,
  selectAutoScale,
  (
    xValues,
    xValuesWithoutHidden,
    xValuesDate,
    xValuesDateWithoutHidden,
    variableRanges: VariableRangesType,
    xIndex: number,
    columnTypes,
    xScaleType: string,
    selectAutoScale: boolean,
  ): ExtentType => {
    return getExtent(
      xValues,
      xValuesWithoutHidden,
      xValuesDate,
      xValuesDateWithoutHidden,
      variableRanges,
      xIndex,
      columnTypes,
      xScaleType,
      selectAutoScale,
    );
  },
);

const selectYExtent = createSelector(
  selectYValues,
  selectYValuesWithoutHidden,
  selectYValuesDate,
  selectYValuesDateWithoutHidden,
  selectVariableRanges,
  selectYIndex,
  selectColumnTypes,
  selectYScaleType,
  selectAutoScale,
  (
    yValues,
    yValuesWithoutHidden,
    yValuesDate,
    yValuesDateWithoutHidden,
    variableRanges: VariableRangesType,
    yIndex: number,
    columnTypes,
    yScaleType: string,
    selectAutoScale: boolean,
  ): ExtentType => {
    return getExtent(
      yValues,
      yValuesWithoutHidden,
      yValuesDate,
      yValuesDateWithoutHidden,
      variableRanges,
      yIndex,
      columnTypes,
      yScaleType,
      selectAutoScale,
    );
  },
);

export const selectVExtent = createSelector(
  selectVValues,
  selectVValuesWithoutHidden,
  selectVValuesDate,
  selectVValuesDateWithoutHidden,
  selectVariableRanges,
  selectVIndex,
  selectColumnTypes,
  selectVScaleType,
  selectAutoScale,
  (
    vValues,
    vValuesWithoutHidden,
    vValuesDate,
    vValuesDateWithoutHidden,
    variableRanges: VariableRangesType,
    vIndex: number,
    columnTypes,
    vScaleType: string,
    selectAutoScale: boolean,
  ): ExtentType => {
    return getExtent(
      vValues,
      vValuesWithoutHidden,
      vValuesDate,
      vValuesDateWithoutHidden,
      variableRanges,
      vIndex,
      columnTypes,
      vScaleType,
      selectAutoScale,
    );
  },
);

// Helper function to calculate adjusted margins
const calculateAdjustedMargins = (
  margin1: number,
  margin2: number,
  size: number,
  minSize: number,
) => {
  // Ensure size is at least minSize
  size = Math.max(size, minSize);

  // Check if margins are too large
  if (margin1 + margin2 + minSize > size) {
    // Adjust the margins to maintain a minimum difference of minSize
    const totalMargin = margin1 + margin2;
    let totalAdjustedMargin = size - minSize;
    totalAdjustedMargin = Math.max(totalAdjustedMargin, 0); // Ensure totalMargin is not less than 0

    // Reduce margins, keeping their relative sizes the same
    margin1 = Math.round((margin1 / totalMargin) * totalAdjustedMargin);
    margin2 = Math.round((margin2 / totalMargin) * totalAdjustedMargin);
  }
  return [margin1, margin2, size];
};

// Returns the start and end of the scatterplot x-axis area relative
// to the entire width of the scatterplot pane by adjusting for left and right margins.
export const selectXScaleRange = createSelector(
  selectScatterplotMarginLeft,
  selectScatterplotMarginRight,
  selectScatterplotPaneWidth,
  (margin_left: number, margin_right: number, width: number): ScaleRangeType => {
    [margin_left, margin_right, width] = calculateAdjustedMargins(
      margin_left,
      margin_right,
      width,
      X_AXIS_MIN_WIDTH,
    );
    return [0 + margin_left, width - margin_right];
  },
);

// Returns the start and end of the scatterplot y-axis area relative
// to the entire height of the scatterplot pane by adjusting for top and bottom margins.
export const selectYScaleRange = createSelector(
  selectScatterplotMarginTop,
  selectScatterplotMarginBottom,
  selectScatterplotPaneHeight,
  (margin_top: number, margin_bottom: number, height: number): ScaleRangeType => {
    [margin_top, margin_bottom, height] = calculateAdjustedMargins(
      margin_top,
      margin_bottom,
      height,
      Y_AXIS_MIN_HEIGHT,
    );
    return [height - margin_bottom - X_AXIS_TICK_LABEL_HEIGHT, 0 + margin_top];
  },
);

// Returns the start and end of the scatterplot legend axis area relative
// to the entire height of the scatterplot pane by adjusting for top and bottom margins
// and dividing the remaining space by half.
export const selectLegendScaleRange = createSelector(
  selectScatterplotMarginTop,
  selectScatterplotMarginBottom,
  selectScatterplotPaneHeight,
  (margin_top: number, margin_bottom: number, height: number): ScaleRangeType => {
    [margin_top, margin_bottom, height] = calculateAdjustedMargins(
      margin_top,
      margin_bottom,
      height,
      Y_AXIS_MIN_HEIGHT,
    );
    const legend_height = (height - margin_top - margin_bottom) / 2;
    return [0, legend_height];
  },
);

// Returns the start and end of the scatterplot x-axis area in absolute pixel values.
export const selectXRangeCanvas = createSelector(
  selectScatterplotMarginLeft,
  selectScatterplotMarginRight,
  selectScatterplotPaneWidth,
  (margin_left: number, margin_right: number, width: number): ScaleRangeType => {
    [margin_left, margin_right, width] = calculateAdjustedMargins(
      margin_left,
      margin_right,
      width,
      X_AXIS_MIN_WIDTH,
    );
    return [0, width - margin_left - margin_right];
  },
);

// Returns the start and end of the scatterplot y-axis area in absolute pixel values.
export const selectYRangeCanvas = createSelector(
  selectScatterplotMarginTop,
  selectScatterplotMarginBottom,
  selectScatterplotPaneHeight,
  (margin_top: number, margin_bottom: number, height: number): ScaleRangeType => {
    [margin_top, margin_bottom, height] = calculateAdjustedMargins(
      margin_top,
      margin_bottom,
      height,
      Y_AXIS_MIN_HEIGHT,
    );
    return [height - margin_top - margin_bottom - X_AXIS_TICK_LABEL_HEIGHT, 0];
  },
);

export const selectXTicks = createSelector(
  selectXRangeCanvas,
  (xRangeCanvas: ScaleRangeType): number => {
    return Math.round(xRangeCanvas[1] / 85);
  },
);

export const selectYTicks = createSelector(
  selectYRangeCanvas,
  (yRangeCanvas: ScaleRangeType): number => {
    return Math.round(yRangeCanvas[0] / 50);
  },
);

export type SlycatScaleType =
  | d3.ScaleLinear<number, number>
  | d3.ScaleLogarithmic<number, number>
  | d3.ScaleTime<number, number>
  | d3.ScalePoint<string>
  | d3.ScaleBand<string>;

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
  selectShowHistogram,
  (
    xScaleType: string,
    xExtent: ExtentType,
    xScaleRange: ScaleRangeType,
    xColumnType: string | undefined,
    xValues,
    selectShowHistogram,
  ): SlycatScaleType => {
    return getScale(xScaleType, xExtent, xScaleRange, xColumnType, xValues, selectShowHistogram);
  },
);

export const selectXScaleAxis = createSelector(
  selectXScale,
  selectHorizontalSpacing,
  selectHideLabels,
  selectXColumnType,
  (
    xScale: SlycatScaleType,
    horizontalSpacing: number,
    hideLabels: boolean,
    xColumnType: string | undefined,
  ): SlycatScaleType => {
    return adjustScaleDomain(xScale, horizontalSpacing, xColumnType === "string" && hideLabels);
  },
);

export const selectYScale = createSelector(
  selectYScaleType,
  selectYExtent,
  selectYScaleRange,
  selectYColumnType,
  selectYValues,
  selectShowHistogram,
  (
    yScaleType: string,
    yExtent: ExtentType,
    yScaleRange: ScaleRangeType,
    yColumnType: string,
    yValues,
    selectShowHistogram,
  ): SlycatScaleType => {
    return getScale(yScaleType, yExtent, yScaleRange, yColumnType, yValues, selectShowHistogram);
  },
);

export const selectYScaleAxis = createSelector(
  selectYScale,
  selectVerticalSpacing,
  selectHideLabels,
  selectYColumnType,
  (yScale: SlycatScaleType, verticalSpacing: number, hideLabels: boolean, yColumnType: string) => {
    return adjustScaleDomain(yScale, verticalSpacing, yColumnType === "string" && hideLabels, 1);
  },
);

export const selectVScale = createSelector(
  selectVScaleType,
  selectVExtent,
  selectLegendScaleRange,
  selectVColumnType,
  selectVValues,
  selectShowHistogram,
  (
    vScaleType: string,
    vExtent: ExtentType,
    vScaleRange: ScaleRangeType,
    vColumnType: string,
    vValues,
    showHistogram,
  ): SlycatScaleType => {
    return getScale(vScaleType, vExtent, vScaleRange, vColumnType, vValues, showHistogram);
  },
);

export const selectLegendScaleAxis = createSelector(
  selectVScale,
  selectVerticalSpacing,
  selectHideLabels,
  selectVColumnType,
  (
    legendScale: SlycatScaleType,
    verticalSpacing: number,
    hideLabels: boolean,
    vColumnType: string,
  ) => {
    return adjustScaleDomain(
      legendScale,
      verticalSpacing,
      vColumnType === "string" && hideLabels,
      1,
      true,
    );
  },
);

const getScale = (
  scaleType: string,
  extent: ExtentType,
  scaleRange: ScaleRangeType,
  columnType: string | undefined,
  values: ValuesType,
  showHistogram: boolean,
): SlycatScaleType => {
  let scale;
  switch (scaleType) {
    case "Date & Time":
      scale = d3.scaleTime();
      break;
    case "Log":
      scale = d3.scaleLog();
      break;
    default:
      // For numeric values, use a linear scale.
      if (columnType !== "string") scale = d3.scaleLinear();
      // Otherwise, use a band scale for string values
      else if (showHistogram) scale = d3.scaleBand();
      else scale = d3.scalePoint();
  }
  // Domain is the min and max values for numeric values or Date & Time scales,
  // otherwise the locale sorted unique values for string variables.
  const domain =
    columnType === "string" && scaleType !== "Date & Time"
      ? _.uniq(values).sort((a, b) => {
          return a.toString().localeCompare(b.toString());
        })
      : extent;
  return scale.range(scaleRange).domain(domain);
};

const adjustScaleDomain = (
  scale: SlycatScaleType,
  spacing: number,
  adjust: boolean,
  align?: number,
  reverse?: boolean,
): SlycatScaleType => {
  // Make a duplicate copy of the scale
  let adjusted_scale = scale.copy();
  // Adjust the domain to leave out values that are too close together.
  if (adjust && "step" in adjusted_scale && adjusted_scale.step() < spacing) {
    // Calculate how many ticks to skip based on current step size
    const skipFactor = Math.ceil(spacing / adjusted_scale.step());
    // Calculate padding ratio based on removed values
    const originalDomain = adjusted_scale.domain();
    const lastKeptIndex = Math.floor((originalDomain.length - 1) / skipFactor) * skipFactor;
    const removedFromEnd = originalDomain.length - 1 - lastKeptIndex;
    const paddingRatio = removedFromEnd / skipFactor / 2;
    adjusted_scale
      // Filter the domain starting from the first value and keeping every nth value after
      .domain(
        // Reverse filtering for some axes, like the legend axis,
        // otherwise it's inconsistent with the y axis.
        reverse
          ? adjusted_scale
              .domain()
              .filter((d, i) => i % skipFactor === 0)
              .reverse()
          : adjusted_scale.domain().filter((d, i) => i % skipFactor === 0),
      )
      // Adjust the axis padding to fit the original scale
      .padding(paddingRatio)
      // Align the axis to fit the original scale
      .align(align ?? 0);
  }
  // Reverse the domain if requested even if no filtering was done.
  else if (reverse) {
    adjusted_scale.domain(adjusted_scale.domain().reverse());
  }
  return adjusted_scale;
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
  selectScatterplotMarginTop,
  selectScatterplotMarginBottom,
  selectScatterplotPaneHeight,
  (margin_top: number, margin_bottom: number, height: number): number => {
    [margin_top, margin_bottom, height] = calculateAdjustedMargins(
      margin_top,
      margin_bottom,
      height,
      Y_AXIS_MIN_HEIGHT,
    );
    return margin_top + height / 2;
  },
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
