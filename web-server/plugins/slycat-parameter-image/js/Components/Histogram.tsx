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
  selectXValues,
  selectYScaleRange,
} from "../selectors";
import { selectShowHistogram, selectScatterplotPaneHeight } from "../scatterplotSlice";
import slycat_color_maps from "js/slycat-color-maps";

type HistogramProps = {};

const Histogram: React.FC<HistogramProps> = (props) => {
  const gridRef = useRef<SVGGElement>(null);

  // Select values from the state with `useSelector`
  const show_histogram = useSelector(selectShowHistogram);
  const colormap = useSelector(selectColormap);
  const x_scale = useSelector(selectXScale);
  // const y_scale = useSelector(selectYScale);
  const y_scale_range = useSelector(selectYScaleRange);
  const x_ticks = useSelector(selectXTicks);
  const y_ticks = useSelector(selectYTicks);
  const x_values = useSelector(selectXValues);
  const height = useSelector(selectScatterplotPaneHeight);

  const scatterplot_grid_color = slycat_color_maps.get_scatterplot_grid_color(colormap);

  // Only execute the useEffect hook if show_grid is true
  useEffect(() => {
    if (show_histogram) {
      updateGrid();
    }
  });

  const updateGrid = () => {
    const bins = d3
      .bin()
      .value((d: number | string) => d)
      // .thresholds([0, 2, 4, 6, 8, 10])
      .domain(x_scale.domain())(x_values);

    console.debug(`bins: %o`, bins);

    // Declare the y (vertical position) scale.
    const y_scale = d3
      .scaleLinear()
      .domain([0, d3.max(bins, (d) => d.length)])
      .range(y_scale_range);

    const allRects = bins.map((bin, i) => {
      return (
        <rect
          key={i}
          fill="#69b3a2"
          stroke="black"
          x={x_scale(bin.x0)}
          width={x_scale(bin.x1) - x_scale(bin.x0)}
          y={y_scale(bin.length)}
          height={height - y_scale(bin.length)}
        />
      );
    });

    // const setStrokeStyle = (sel: d3.Selection<SVGGElement, unknown, null, undefined>) => {
    //   sel.style("stroke", scatterplot_grid_color);
    // };

    // const gridline = fc
    //   .annotationSvgGridline()
    //   .xScale(x_scale)
    //   .yScale(y_scale)
    //   .xTicks(x_ticks)
    //   .yTicks(y_ticks)
    //   .xDecorate(setStrokeStyle)
    //   .yDecorate(setStrokeStyle);
    // d3.select(gridRef.current).call(gridline);
  };

  const bins = d3
    .bin()
    .value((d: number | string) => d)
    // .thresholds([0, 2, 4, 6, 8, 10])
    .domain(x_scale.domain())(x_values);

  console.debug(`bins: %o`, bins);

  // Declare the y (vertical position) scale.
  const y_scale = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (d) => d.length)])
    .range(y_scale_range);

  const allRects = bins.map((bin, i) => {
    return (
      <rect
        key={i}
        fill="#69b3a2"
        stroke="black"
        x={x_scale(bin.x0)}
        width={x_scale(bin.x1) - x_scale(bin.x0)}
        y={y_scale(bin.length)}
        height={height - y_scale(bin.length)}
      />
    );
  });

  // return null;

  // Only render the component if show_histogram is true
  if (!show_histogram) {
    return null;
  }
  return <g id="histogram" ref={gridRef}>{allRects}</g>;
};

export default Histogram;
