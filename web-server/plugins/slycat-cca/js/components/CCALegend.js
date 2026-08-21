/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC.
Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
retains certain rights in this software. */

import React from "react";
import { connect } from "react-redux";
import ColorByLegend from "components/ColorByLegend";
import slycat_color_maps from "js/slycat-color-maps";

/** Matches legacy CCALegend translate offset (label gutter). */
const LEGEND_X_OFFSET = 110;

function numericExtent(values) {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      continue;
    }
    if (n < min) min = n;
    if (n > max) max = n;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: undefined, max: undefined };
  }
  return { min, max };
}

/**
 * CCA color-by legend: Redux wrapper around shared ColorByLegend.
 * CCA color-by is numeric only. Keeps #legend SVG for CCA CSS / scatterplot
 * hit-testing; embeds ColorByLegend as <g>.
 */
const CCALegend = (props) => {
  const {
    variable_selected_label,
    scale_v,
    colormap,
    scatterplot_font_size,
    scatterplot_font_family,
    height,
    canvas_width,
    canvas_height,
    position,
  } = props;

  if (variable_selected_label === undefined || scale_v === undefined) {
    return null;
  }

  const { min, max } = numericExtent(scale_v);
  const model = slycat_color_maps.buildColorByLegendModel({
    colormap,
    variableKind: "numeric",
    min,
    max,
  });

  return (
    <svg id="legend" width="100%" height="100%">
      <ColorByLegend
        as="g"
        model={model}
        label={variable_selected_label}
        height={height}
        min={min}
        max={max}
        fontSize={scatterplot_font_size}
        fontFamily={scatterplot_font_family}
        position={{
          x: position.x + LEGEND_X_OFFSET,
          y: position.y,
        }}
        draggable
        dragBounds={{ width: canvas_width, height: canvas_height }}
      />
    </svg>
  );
};

const mapStateToProps = (state) => {
  const scale_v =
    state.derived.column_data[state.variable_selected] !== undefined
      ? state.derived.column_data[state.variable_selected].values
      : undefined;

  return {
    variable_selected_label:
      state.derived.table_metadata["column-names"][state.variable_selected],
    scatterplot_font_family: state.scatterplot_font_family,
    scatterplot_font_size: state.scatterplot_font_size,
    colormap: state.colormap,
    scale_v,
  };
};

export default connect(mapStateToProps, null)(CCALegend);
