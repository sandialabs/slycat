import React, { useEffect, useRef } from "react";
import * as d3 from "d3v7";
import * as fc from "d3fc";
import { SlycatScaleType } from "../selectors";

type PlotGridProps = {
  x_scale: SlycatScaleType;
  y_scale: SlycatScaleType;
  x_ticks: number;
  y_ticks: number;
  colormap: string;
  plot_grid_color: string;
};

const PlotGrid: React.FC<PlotGridProps> = (props) => {
  const gridRef = useRef<SVGGElement>(null);

  const x_scale = props.x_scale;
  const y_scale = props.y_scale;
  const x_ticks = props.x_ticks;
  const y_ticks = props.y_ticks;
  const plot_grid_color = props.plot_grid_color;

  useEffect(() => {
    const setStrokeStyle = (sel: d3.Selection<SVGGElement, unknown, null, undefined>) => {
      sel.style("stroke", plot_grid_color);
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
  });

  return (
    <svg className="grid-svg">
      <g id="grid" ref={gridRef} />
    </svg>
  );
};

export default PlotGrid;
