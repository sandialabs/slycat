import React, { useEffect, useRef } from "react";
import * as d3 from "d3v7";
import { SlycatScaleType, ValueIndexType } from "../selectors";
import slycat_color_maps from "js/slycat-color-maps";

type HistogramProps = {
  x_scale: SlycatScaleType;
  y_scale: SlycatScaleType;
  y_scale_range: number[];
  bins: d3.Bin<ValueIndexType, number>[];
  selected_bin_indexes: number[];
  partially_selected_bin_indexes: number[];
  flash_bin_indexes: number[];
  x_ticks: number;
  y_ticks: number;
  histogram_bar_color: string;
  histogram_bar_stroke_width: number;
  histogram_bar_selected_stroke_width: number;
  font_size: number;
  font_family: string;
  x_label_y: number;
  x_label_x: number;
  x_name: string;
  y_label_y: number;
  colormap: string;
  y_label_horizontal_offset: number;
  handleBinClick: (
    event: React.MouseEvent<SVGRectElement, MouseEvent>,
    bin: {
      range: (number | undefined)[];
      count: number;
      index: number;
      bins_length: number;
      data: d3.Bin<ValueIndexType, number>;
    },
  ) => void;
  handleBackgroundClick: (event: React.MouseEvent) => void;
};

const Histogram: React.FC<HistogramProps> = (props) => {
  const histogramRef = useRef<SVGSVGElement>(null);

  const {
    colormap,
    x_scale,
    y_scale_range,
    x_ticks,
    y_ticks,
    histogram_bar_stroke_width,
    histogram_bar_selected_stroke_width,
    font_size,
    font_family,
    x_label_y,
    x_label_x,
    x_name,
    y_label_y,
    bins,
    selected_bin_indexes,
    partially_selected_bin_indexes,
    flash_bin_indexes,
    y_scale,
    histogram_bar_color,
    y_label_horizontal_offset,
    handleBinClick,
    handleBackgroundClick,
  } = props;

  // If x_scale is a band scale, set the padding to 0.1 to create
  // spacing between bars.
  x_scale.bandwidth && x_scale.padding(0.1);

  // Flash the selected bins
  const doFlashBins = () => {
    // Select the histogram
    const histogram = d3.select(histogramRef.current);
    // Select all the bars
    const bars = histogram.selectAll("rect");
    // Set the duration of the transition
    const duration = 500;
    // Set the delay of the transition
    const delay = 0;
    // Set the color of the flash
    const flash_color = "red";
    // Set the opacity of the flash
    const flash_opacity = 0.5;
    // Flash the bins
    flash_bin_indexes.forEach((binIndex) => {
      bars
        .filter((d, i) => i === binIndex)
        .transition()
        .duration(duration)
        .delay(delay)
        .style("fill", flash_color)
        .style("opacity", flash_opacity)
        .transition()
        .duration(duration)
        .delay(delay)
        .style("fill", "")
        .style("opacity", "");
    });
  };

  // This effect creates the histogram using d3.
  useEffect(() => {
    // Create a color scale for y axis
    const color_scale = slycat_color_maps.get_color_scale_d3v7(
      colormap,
      y_scale.domain()[0],
      y_scale.domain()[1],
    );

    const getStrokeWidth = (bin: d3.Bin<ValueIndexType, number>): number => {
      const binIndex = bins.indexOf(bin);
      const isSelected =
        selected_bin_indexes.includes(binIndex) ||
        partially_selected_bin_indexes.includes(binIndex);
      return isSelected ? histogram_bar_selected_stroke_width : histogram_bar_stroke_width;
    };

    const getStrokeDasharray = (bin: d3.Bin<ValueIndexType, number>) => {
      // Stroke dasharray depends on whether the bin is partially selected or not.
      return partially_selected_bin_indexes.includes(bins.indexOf(bin)) ? "10,5" : "";
    };

    const getBarWidth = (bin: d3.Bin<ValueIndexType, number>) => {
      const actualWidth = x_scale.bandwidth
        ? // If x_scale is a band scale, then the width of the bar is the width of the band.
          x_scale.bandwidth()
        : // If width is 0, set it to 20 so that the bar is visible.
          // This can happen when there is only one bin.
          x_scale(bin.x1) - x_scale(bin.x0) || 20;

      // Adjust width based on stroke width.
      // If stroke width is greater than the width, set width to 0 to prevent a negative width.
      const adjustedWidth = Math.max(0, actualWidth - getStrokeWidth(bin));
      return adjustedWidth;
    };

    // Add a rect for each bin.
    const histogram = d3.select(histogramRef.current);
    histogram.selectAll("*").remove();
    histogram
      .append("g")
      .attr("stroke", "black")
      .selectAll()
      .data(bins)
      .join("rect")
      .attr("stroke-dasharray", (bin) => getStrokeDasharray(bin))
      // Color bars using histogram_bar_color if available, otherwise color them
      // based on their length.
      .attr("fill", (bin) => {
        const color = color_scale(bin.length);
        return histogram_bar_color ?? `rgb(${color.r} ${color.g} ${color.b})`;
      })
      .attr("stroke-width", (bin) => getStrokeWidth(bin))
      // Adjust x position based on stroke width
      .attr("x", (bin) => x_scale(bin.x0) + 0.5 * getStrokeWidth(bin))
      .attr("width", (bin) => getBarWidth(bin))
      // Adjust y position based on stroke width
      .attr("y", (bin) => y_scale(bin.length) + 0.5 * getStrokeWidth(bin))
      // Adjust height based on stroke width, but must be at least 0.
      .attr("height", (bin) => Math.max(0, y_scale(0) - y_scale(bin.length) - getStrokeWidth(bin)))
      // On click, run a function
      .on("click", (event, bin) => {
        // Get the bin range
        const range = [bin.x0, bin.x1];
        // Get the bin count
        const count = bin.length;
        // Get the bin index
        const index = bins.indexOf(bin);
        // Get the length of the bins array
        const bins_length = bins.length;
        // Get the bin data
        const data = bin;

        // Run the callback function
        handleBinClick(event, {
          range,
          count,
          index,
          bins_length,
          data,
        });
      })
      .append("title")
      .text(
        (bin) =>
          `Count: ${bin.length}\n\nRange: ${bin.x0} (inclusive) to \n${bin.x1} (exclusive, except for last bar)`,
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

  // Flash bins only when flash_bin_indexes changes.
  // This effect must be after the effect that creates the histogram.
  useEffect(() => {
    // Flash the bins
    doFlashBins();
  }, [flash_bin_indexes]);

  return <svg className="histogram-svg" ref={histogramRef} onClick={handleBackgroundClick} />;
};

export default Histogram;
