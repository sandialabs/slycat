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
  const colormap = useSelector(selectors.selectColormap);
  const x_scale = useSelector(selectors.selectXScale);
  const y_scale = useSelector(selectors.selectYScale);
  const x_ticks = useSelector(selectors.selectXTicks);
  const y_ticks = useSelector(selectors.selectYTicks);

  const scatterplot_grid_color = slycat_color_maps.get_scatterplot_grid_color(colormap);

  useEffect(() => {
    console.debug("ScatterplotGrid.componentDidMount() updateGrid()");
    updateGrid();
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

  return <g id="grid" ref={gridRef} />;
};

export default ScatterplotGrid;
