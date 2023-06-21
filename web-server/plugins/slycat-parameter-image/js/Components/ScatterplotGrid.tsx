import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import * as d3 from "d3v7";
import * as fc from "d3fc";
import _ from "lodash";
import {
  selectColormap,
  selectXScale,
  selectYScale,
  selectXTicks,
  selectYTicks,
} from "../selectors";
import { selectShowGrid } from "../scatterplotSlice";
import slycat_color_maps from "js/slycat-color-maps";

type ScatterplotGridProps = {};

const ScatterplotGrid: React.FC<ScatterplotGridProps> = (props) => {
  const gridRef = useRef<SVGGElement>(null);

  // Select values from the state with `useSelector`
  const show_grid = useSelector(selectShowGrid);
  const colormap = useSelector(selectColormap);
  const x_scale = useSelector(selectXScale);
  const y_scale = useSelector(selectYScale);
  const x_ticks = useSelector(selectXTicks);
  const y_ticks = useSelector(selectYTicks);

  const scatterplot_grid_color = slycat_color_maps.get_scatterplot_grid_color(colormap);

  // Only execute the useEffect hook if show_grid is true
  useEffect(() => {
    if (show_grid) {
      updateGrid();
    }
  });

  const updateGrid = () => {
    const setStrokeStyle = (sel: d3.Selection<SVGGElement, unknown, null, undefined>) => {
      sel.style("stroke", scatterplot_grid_color);
    };

    const gridline = fc
      .annotationSvgGridline()
      .xScale(x_scale)
      .yScale(y_scale)
      .xTicks(x_ticks)
      .yTicks(y_ticks)
      .xDecorate(setStrokeStyle)
      .yDecorate(setStrokeStyle);
    d3.select(gridRef.current).call(gridline);
  };

  // Only render the component if show_grid is true
  if (!show_grid) {
    return null;
  }
  return <g id="grid" ref={gridRef} />;
};

export default ScatterplotGrid;
