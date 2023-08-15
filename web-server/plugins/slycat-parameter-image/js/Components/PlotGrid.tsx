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
  show_vertical_grid_lines?: boolean;
  show_horizontal_grid_lines?: boolean;
};

const PlotGrid: React.FC<PlotGridProps> = ({
  x_scale,
  y_scale,
  x_ticks,
  y_ticks,
  colormap,
  plot_grid_color,
  show_vertical_grid_lines = true,
  show_horizontal_grid_lines = true,
}) => {
  const gridRef = useRef<SVGGElement>(null);

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
    
    // Remove grid lines if they are disabled
    if (!show_vertical_grid_lines) {
      gridline.xTickValues([]);
    }
    if (!show_horizontal_grid_lines) {
      gridline.yTickValues([]);
    }
    
    d3.select(gridRef.current).call(gridline);
  });

  return (
    <svg className="grid-svg">
      <g id="grid" ref={gridRef} />
    </svg>
  );
};

export default PlotGrid;
