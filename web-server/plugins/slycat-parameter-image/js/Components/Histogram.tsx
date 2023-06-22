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
import {
  selectShowHistogram,
  selectScatterplotPaneHeight,
  selectUnselectedBorderSize,
} from "../scatterplotSlice";
import slycat_color_maps from "js/slycat-color-maps";

type HistogramProps = {};

const Histogram: React.FC<HistogramProps> = (props) => {
  const histogramRef = useRef<SVGGElement>(null);

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
  const histogram_bar_stroke_width = useSelector(selectUnselectedBorderSize);

  const histogram_bar_color = slycat_color_maps.get_histogram_bar_color(colormap);

  // Only execute the useEffect hook if show_histogram is true
  useEffect(() => {
    if (show_histogram) {
      updateHistogram();
    }
  });

  const updateHistogram = () => {
    const bins = d3
      .bin()
      .value((d: number | string) => d)
      // .thresholds([0, 2, 4, 6, 8, 10])
      // .thresholds(x_scale.ticks())
      .thresholds(x_ticks)(
      // .domain(x_scale.domain())
      x_values
    );
    console.debug(`bins: %o`, bins);
    console.debug(`x_scale.ticks(): %o`, x_scale.ticks());

    // Declare the y (vertical position) scale.
    const y_scale = d3
      .scaleLinear()
      .domain([0, d3.max(bins, (d) => d.length)])
      .range(y_scale_range);

    // Add a rect for each bin.
    const histogram = d3.select(histogramRef.current);
    histogram.selectAll("*").remove();
    histogram
      .append("g")
      .attr("fill", histogram_bar_color)
      .attr("stroke", "black")
      .attr("stroke-width", histogram_bar_stroke_width)
      .selectAll()
      .data(bins)
      .join("rect")
      .attr("x", (d) => x_scale(d.x0) + 0)
      .attr("width", (d) => x_scale(d.x1) - x_scale(d.x0) - 0)
      .attr("y", (d) => y_scale(d.length))
      .attr("height", (d) => y_scale(0) - y_scale(d.length))
      .append("title")
      .text((d) => `Count: ${d.length}\n\nRange: ${d.x0} (inclusive) to \n${d.x1} (exclusive, except for last bar)`);

    // Add the x-axis and label.
    histogram
      .append("g")
      .attr("transform", `translate(0,${y_scale_range[0]})`)
      .call(d3.axisBottom(x_scale).ticks(x_ticks).tickSizeOuter(0));
    // .call((g) =>
    //   g
    //     .append("text")
    //     .attr("x", width)
    //     .attr("y", marginBottom - 4)
    //     .attr("fill", "currentColor")
    //     .attr("text-anchor", "end")
    //     .text("Unemployment rate (%) →")
    // )
  };

  // Only render the component if show_histogram is true
  if (!show_histogram) {
    return null;
  }
  return <g id="histogram" ref={histogramRef} />;
};

export default Histogram;
