import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import * as d3 from "d3v7";
import * as fc from "d3fc";
import _ from "lodash";
import * as helpers from "../parameter-image-scatterplot-helpers";

type ScatterplotGridProps = {};

const ScatterplotGrid: React.FC<ScatterplotGridProps> = (props) => {
  const gridRef = useRef<SVGGElement>(null);

  // Select values from the state with `useSelector`
  const x_scale_range = useSelector(helpers.selectXScaleRange);
  const y_scale_range = useSelector(helpers.selectYScaleRange);
  const x_values = useSelector(helpers.selectXValues);
  const y_values = useSelector(helpers.selectYValues);
  const x_range_canvas = useSelector(helpers.selectXRangeCanvas);
  const y_range_canvas = useSelector(helpers.selectYRangeCanvas);
  
  const x_ticks = x_range_canvas[1] / 85;
  const y_ticks = y_range_canvas[0] / 50;

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
      .yTicks(y_ticks);
    d3.select(gridRef.current).call(gridline);
  };

  return <g id="grid" ref={gridRef} />;
};

export default ScatterplotGrid;
