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

  const x_ticks = x_range_canvas[1] / 85;
  const y_ticks = y_range_canvas[0] / 50;
  const scatterplot_grid_color = slycat_color_maps.get_scatterplot_grid_color();

  useEffect(() => {
    console.debug("ScatterplotGrid.componentDidMount() updateGrid()");
    updateGrid();
  });

  const updateGrid = () => {
    const xScale = d3
      .scaleLinear()
      .range(x_scale_range)
      .domain([d3.min(x_values), d3.max(x_values)]);
    const yScale = d3
      .scaleLinear()
      .range(y_scale_range)
      .domain([d3.min(y_values), d3.max(y_values)]);
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
