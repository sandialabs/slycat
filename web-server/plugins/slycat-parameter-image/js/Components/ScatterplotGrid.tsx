import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import * as d3 from "d3v7";
import * as fc from "d3fc";
import _ from "lodash";
import * as selectors from "../selectors";
import slycat_color_maps from "js/slycat-color-maps";

type ScatterplotGridProps = {};

const ScatterplotGrid: React.FC<ScatterplotGridProps> = (props) => {
  const gridRef = useRef<SVGGElement>(null);

  // Select values from the state with `useSelector`
  const x_scale_range = useSelector(selectors.selectXScaleRange);
  const y_scale_range = useSelector(selectors.selectYScaleRange);
  const x_values = useSelector(selectors.selectXValues);
  const y_values = useSelector(selectors.selectYValues);
  const x_range_canvas = useSelector(selectors.selectXRangeCanvas);
  const y_range_canvas = useSelector(selectors.selectYRangeCanvas);
  const colormap = useSelector(selectors.selectColormap);
  const x_scale_type = useSelector(selectors.selectXScaleType);
  const y_scale_type = useSelector(selectors.selectYScaleType);
  const x_min = useSelector(selectors.selectXMin);
  const x_max = useSelector(selectors.selectXMax);
  const y_min = useSelector(selectors.selectYMin);
  const y_max = useSelector(selectors.selectYMax);

  const x_ticks = x_range_canvas[1] / 85;
  const y_ticks = y_range_canvas[0] / 50;
  const scatterplot_grid_color = slycat_color_maps.get_scatterplot_grid_color(colormap);

  useEffect(() => {
    console.debug("ScatterplotGrid.componentDidMount() updateGrid()");
    updateGrid();
  });

  // TODO: This is just a start and currently only supports linear and log scales.
  // TODO: This should be moved to a selector?
  // TODO: This needs to work for string variables.
  // TODO: This needs to work for date/time scales.
  const getScale = (scale_type: string) => {
    switch (scale_type) {
      case "Log":
        return d3.scaleLog();
      case "Date & Time":
        return d3.scaleTime();
      default:
        return d3.scaleLinear();
    }
  };

  const updateGrid = () => {
    const xScale = getScale(x_scale_type)
      .range(x_scale_range)
      .domain([x_min, x_max]);
    const yScale = getScale(y_scale_type)
      .range(y_scale_range)
      .domain([y_min, y_max]);
    const gridline = fc
      .annotationSvgGridline()
      .xScale(xScale)
      .yScale(yScale)
      .xTicks(x_ticks)
      .yTicks(y_ticks)
      .xDecorate((sel) => sel.style("stroke", scatterplot_grid_color))
      .yDecorate((sel) => sel.style("stroke", scatterplot_grid_color));
    d3.select(gridRef.current).call(gridline);
  };

  return <g id="grid" ref={gridRef} />;
};

export default ScatterplotGrid;
