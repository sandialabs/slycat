import React, { useEffect, useRef } from "react";
import * as d3 from "d3v7";
import { SlycatScaleType } from "../selectors";
import slycat_color_maps from "js/slycat-color-maps";

type HistogramProps = {
  x_scale: SlycatScaleType;
  y_scale: SlycatScaleType;
  y_scale_range: number[];
  bins: d3.Bin<number, number>[];
  x_ticks: number;
  y_ticks: number;
  histogram_bar_color: string;
  histogram_bar_stroke_width: number;
  font_size: number;
  font_family: string;
  x_label_y: number;
  x_label_x: number;
  x_name: string;
  y_label_y: number;
  colormap: string;
  y_label_horizontal_offset: number;
};

const Histogram: React.FC<HistogramProps> = (props) => {
  const histogramRef = useRef<SVGSVGElement>(null);

  const colormap = props.colormap;
  const x_scale = props.x_scale;
  const y_scale_range = props.y_scale_range;
  const x_ticks = props.x_ticks;
  const y_ticks = props.y_ticks;
  const histogram_bar_stroke_width = props.histogram_bar_stroke_width;
  const font_size = props.font_size;
  const font_family = props.font_family;
  const x_label_y = props.x_label_y;
  const x_label_x = props.x_label_x;
  const x_name = props.x_name;
  const y_label_y = props.y_label_y;
  const bins = props.bins;
  const y_scale = props.y_scale;
  const histogram_bar_color = props.histogram_bar_color;
  const y_label_horizontal_offset = props.y_label_horizontal_offset;

  useEffect(() => {
    // Create a color scale for y axis
    const color_scale = slycat_color_maps.get_color_scale_d3v7(
      colormap,
      y_scale.domain()[0],
      y_scale.domain()[1],
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
      // Color bars using histogram_bar_color if available, otherwise color them
      // based on their length.
      .attr("fill", (d) => {
        const color = color_scale(d.length);
        return histogram_bar_color ?? `rgb(${color.r} ${color.g} ${color.b})`;
      })
      .attr("x", (d) => x_scale(d.x0))
      .attr("width", (d) => {
        const width = x_scale(d.x1) - x_scale(d.x0);
        // If width is 0, set it to 20 so that the bar is visible.
        // This can happen when there is only one bin.
        return width === 0 ? 20 : width;
      })
      .attr("y", (d) => y_scale(d.length))
      .attr("height", (d) => y_scale(0) - y_scale(d.length))
      .append("title")
      .text(
        (d) =>
          `Count: ${d.length}\n\nRange: ${d.x0} (inclusive) to \n${d.x1} (exclusive, except for last bar)`,
      );

    // Add the x-axis and label.
    histogram
      .append("g")
      .attr("class", "x-axis")
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
          .text(x_name),
      )
      .selectAll(".tick text")
      .style("text-anchor", "start")
      .attr("transform", "rotate(15)");

    // Add the y-axis and label.
    histogram
      .append("g")
      .attr("class", "y-axis")
      .style("font-size", font_size + "px")
      .style("font-family", font_family)
      .attr("transform", `translate(${x_scale.range()[0]},0)`)
      .call(d3.axisLeft(y_scale).ticks(y_ticks))
      .call((g) => {
        // Get the width of the y-axis element
        const y_axis_width = g.node().getBBox().width;
        const y_label_x = -(y_axis_width + y_label_horizontal_offset);
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
  });

  return <svg className="histogram-svg" ref={histogramRef} />;
};

export default Histogram;
