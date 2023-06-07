import { createSelector } from "@reduxjs/toolkit";

const selectMarginLeft = (state) => state.scatterplot_margin.left;
const selectMarginRight = (state) => state.scatterplot_margin.right;
const selectMarginTop = (state) => state.scatterplot_margin.top;
const selectMarginBottom = (state) => state.scatterplot_margin.bottom;
const selectWidth = (state) => state.ui.scatterplot_pane_width;
const selectHeight = (state) => state.ui.scatterplot_pane_height;
export const selectXValues = (state) => state.derived.xValues;
export const selectYValues = (state) => state.derived.yValues;

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

export const selectColormap = (state) => state.colormap;
