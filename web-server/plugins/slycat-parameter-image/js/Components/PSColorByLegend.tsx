/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC.
Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
retains certain rights in this software. */

import React from "react";
import { useSelector } from "react-redux";
import ColorByLegend from "components/ColorByLegend";
import slycat_color_maps from "js/slycat-color-maps";
import {
  selectColormap,
  selectVColumnName,
  selectVColumnType,
  selectVIsCategorical,
  selectVExtent,
  selectVScaleType,
  selectVScale,
  selectVValuesArray,
  selectVValuesWithoutHidden,
  selectLegendScaleRange,
  selectScatterplotMarginTop,
  selectScatterplotMarginRight,
  selectScatterplotMarginBottom,
} from "../selectors";
import {
  selectAutoScale,
  selectFontFamily,
  selectFontSize,
  selectHideLabels,
  selectScatterplotPaneHeight,
  selectScatterplotPaneWidth,
  selectVerticalSpacing,
} from "../scatterplotSlice";
import { getUniqueCategoryValues } from "../unique-category-values";

/** Matches legacy update_legend_position offset past the plot right margin. */
const LEGEND_X_OFFSET = 100;

function numericExtentFromVExtent(
  extent: [unknown, unknown] | undefined,
): { min?: number; max?: number } {
  if (!extent || extent.length < 2) {
    return {};
  }
  const numeric = extent.map((value) =>
    value instanceof Date ? value.valueOf() : Number(value),
  );
  if (numeric.length < 2 || !numeric.every((value) => Number.isFinite(value))) {
    return {};
  }
  return { min: Math.min(...numeric), max: Math.max(...numeric) };
}

function dateExtentFromVExtent(
  extent: [unknown, unknown] | undefined,
): { min?: Date; max?: Date } {
  if (!extent || extent.length < 2) {
    return {};
  }
  const dates = extent.map((value) =>
    value instanceof Date ? value : new Date(value as number | string),
  );
  if (dates.length < 2 || dates.some((date) => Number.isNaN(date.valueOf()))) {
    return {};
  }
  return dates[0].valueOf() <= dates[1].valueOf()
    ? { min: dates[0], max: dates[1] }
    : { min: dates[1], max: dates[0] };
}

/**
 * Parameter Space color-by legend: Redux host for shared ColorByLegend.
 * Overlay SVG stays pointer-events:none; ColorByLegend re-enables hits when
 * draggable so scatterplot selection is unaffected outside the legend.
 */
export const PSColorByLegend: React.FC = () => {
  const colormap = useSelector(selectColormap);
  const label = useSelector(selectVColumnName);
  const columnType = useSelector(selectVColumnType);
  const vIsCategorical = useSelector(selectVIsCategorical);
  const extent = useSelector(selectVExtent);
  const scaleType = useSelector(selectVScaleType);
  const vScale = useSelector(selectVScale);
  const vValues = useSelector(selectVValuesArray);
  const vValuesWithoutHidden = useSelector(selectVValuesWithoutHidden);
  const autoScale = useSelector(selectAutoScale);
  const hideLabels = useSelector(selectHideLabels);
  const verticalSpacing = useSelector(selectVerticalSpacing);
  const fontSize = useSelector(selectFontSize);
  const fontFamily = useSelector(selectFontFamily);
  const paneWidth = useSelector(selectScatterplotPaneWidth);
  const paneHeight = useSelector(selectScatterplotPaneHeight);
  const marginTop = useSelector(selectScatterplotMarginTop);
  const marginRight = useSelector(selectScatterplotMarginRight);
  const marginBottom = useSelector(selectScatterplotMarginBottom);
  const legendRange = useSelector(selectLegendScaleRange);

  if (label === undefined || label === null || label === "") {
    return null;
  }

  // Values cleared on v_index change until the new column arrives — avoid
  // painting a mismatched categorical/numeric legend from stale vValues.
  if (vValues.length === 0) {
    return null;
  }

  const legendHeight = Math.max(0, legendRange[1] - legendRange[0]);
  if (legendHeight <= 0 || paneWidth <= 0 || paneHeight <= 0) {
    return null;
  }

  const useTimeScale = scaleType === "Date & Time";
  const useCategoricalLegend = vIsCategorical && !useTimeScale;

  const uniqueValues = useCategoricalLegend
    ? getUniqueCategoryValues(autoScale ? vValuesWithoutHidden : vValues, {
        numeric: columnType !== "string",
      })
    : undefined;

  const { min, max } = useCategoricalLegend
    ? { min: undefined, max: undefined }
    : useTimeScale
      ? dateExtentFromVExtent(extent as [unknown, unknown])
      : numericExtentFromVExtent(extent as [unknown, unknown]);

  const model = slycat_color_maps.buildColorByLegendModel({
    colormap,
    variableKind: useCategoricalLegend
      ? columnType === "string"
        ? "string"
        : "categorical"
      : "numeric",
    min,
    max,
    uniqueValues,
    scaleType: scaleType as "Linear" | "Log" | "Date & Time" | undefined,
  });

  const scatterplotHeight = paneHeight - marginTop - marginBottom;
  const position = {
    x: paneWidth - marginRight + LEGEND_X_OFFSET,
    y: marginTop + scatterplotHeight / 2 - legendHeight / 2,
  };

  const legendScaleStep =
    vScale && typeof (vScale as { step?: () => number }).step === "function"
      ? (vScale as { step: () => number }).step()
      : undefined;
  const hidden =
    useCategoricalLegend &&
    hideLabels &&
    legendScaleStep !== undefined &&
    legendScaleStep < verticalSpacing;

  return (
    <svg
      id="ps-colorby-legend"
      width={paneWidth}
      height={paneHeight}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <ColorByLegend
        as="g"
        model={model}
        label={label}
        height={legendHeight}
        min={min}
        max={max}
        fontSize={`${fontSize}px`}
        fontFamily={fontFamily}
        position={position}
        hidden={hidden}
        draggable
        dragBounds={{ width: paneWidth, height: paneHeight }}
      />
    </svg>
  );
};

export default PSColorByLegend;
