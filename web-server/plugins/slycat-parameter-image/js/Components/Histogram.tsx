import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import * as d3 from "d3v7";
import * as fc from "d3fc";
import _ from "lodash";
import {
  selectColormap,
  selectXScale,
  selectXTicks,
  selectYTicks,
  selectXValues,
  selectYScaleRange,
  selectXLabelX,
  X_LABEL_VERTICAL_OFFSET,
  selectXColumnName,
  Y_LABEL_HORIZONTAL_OFFSET,
  selectYLabelY,
} from "../selectors";
import {
  selectShowHistogram,
  selectUnselectedBorderSize,
  selectFontSize,
  selectFontFamily,
} from "../scatterplotSlice";
import slycat_color_maps from "js/slycat-color-maps";

type HistogramProps = {};

const Histogram: React.FC<HistogramProps> = (props) => {
  const histogramRef = useRef<SVGSVGElement>(null);

  // Select values from the state with `useSelector`
  const show_histogram = useSelector(selectShowHistogram);
  const colormap = useSelector(selectColormap);
  // Making a copy of the x_scale to avoid mutating the selector since we will be modifying the scale's domain
  const x_scale = useSelector(selectXScale).copy();
  const y_scale_range = useSelector(selectYScaleRange);
  const x_ticks = useSelector(selectXTicks);
  const y_ticks = useSelector(selectYTicks);
  const x_values = useSelector(selectXValues);
  const histogram_bar_stroke_width = useSelector(selectUnselectedBorderSize);
  const font_size = useSelector(selectFontSize);
  const font_family = useSelector(selectFontFamily);
  const x_label_y = X_LABEL_VERTICAL_OFFSET;
  const x_label_x = useSelector(selectXLabelX);
  const x_name = useSelector(selectXColumnName);
  const y_label_y = useSelector(selectYLabelY);

  // const histogram_bar_color = slycat_color_maps.get_histogram_bar_color(colormap);

  // Only execute the useEffect hook if show_histogram is true
  useEffect(() => {
    // Ugly way of hiding and showing the #histogram div to prevent issues with mouse selection
    // of points. This is only necessary while parts of PS not yet in React.
    d3.select("#histogram").style("display", show_histogram ? "block" : "none");

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

    // Declare the y (vertical position) scale.
    const y_scale = d3
      .scaleLinear()
      .domain([0, d3.max(bins, (d) => d.length)])
      .range(y_scale_range);

    // Adjusting x_scale domain to match the bins
    x_scale.domain([bins[0].x0, bins[bins.length - 1].x1]);

    // Create a color scale for y axis
    const color_scale = slycat_color_maps.get_color_scale_d3v7(
      colormap,
      y_scale.domain()[0],
      y_scale.domain()[1]
    );

    // Add a rect for each bin.
    const histogram = d3.select(histogramRef.current);
    histogram.selectAll("*").remove();
    histogram
      .append("g")
      // .attr("fill", histogram_bar_color)
      .attr("stroke", "black")
      .attr("stroke-width", histogram_bar_stroke_width)
      .selectAll()
      .data(bins)
      .join("rect")
      .attr("fill", (d) => {
        const color = color_scale(d.length);
        return `rgb(${color.r} ${color.g} ${color.b})`;
      })
      .attr("x", (d) => x_scale(d.x0) + 0)
      .attr("width", (d) => x_scale(d.x1) - x_scale(d.x0) - 0)
      .attr("y", (d) => y_scale(d.length))
      .attr("height", (d) => y_scale(0) - y_scale(d.length))
      .append("title")
      .text(
        (d) =>
          `Count: ${d.length}\n\nRange: ${d.x0} (inclusive) to \n${d.x1} (exclusive, except for last bar)`
      );

    // Add the x-axis and label.
    histogram
      .append("g")
      .style("font-size", font_size + "px")
      .style("font-family", font_family)
      .attr("transform", `translate(0,${y_scale_range[0]})`)
      .call(d3.axisBottom(x_scale).ticks(x_ticks).tickSizeOuter(0))
      .call((g) =>
        g
          .append("text")
          .attr("class", "label")
          .attr("x", x_label_x)
          .attr("y", x_label_y)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .style("font-weight", "bold")
          .text(x_name)
      )
      .selectAll(".tick text")
      .style("text-anchor", "start")
      .attr("transform", "rotate(15)");

    // Add the y-axis and label, and remove the domain line.
    histogram
      .append("g")
      .style("font-size", font_size + "px")
      .style("font-family", font_family)
      .attr("transform", `translate(${x_scale.range()[0]},0)`)
      .call(d3.axisLeft(y_scale).ticks(y_ticks))
      .call((g) => {
        // Get the width of the y-axis element
        const y_axis_width = g.node().getBBox().width;
        const y_label_x = -(y_axis_width + Y_LABEL_HORIZONTAL_OFFSET)
        return g
          .append("text")
          .attr("class", "label")
          .attr("x", y_label_x)
          .attr("y", y_label_y)
          .attr("fill", "currentColor")
          .attr("transform", "rotate(-90," + y_label_x + "," + y_label_y + ")")
          .style("text-anchor", "middle")
          .style("font-weight", "bold")
          .text("Frequency");
      });
  };

  // Only render the component if show_histogram is true
  if (!show_histogram) {
    return null;
  }
  return (
    <svg
      id="histogram-svg"
      ref={histogramRef}
      style={{ background: slycat_color_maps.get_background(colormap).toString() }}
    />
  );
};

export default Histogram;
