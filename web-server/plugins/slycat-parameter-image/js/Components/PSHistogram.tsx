import React, { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import slycat_color_maps from "js/slycat-color-maps";
import PlotGrid from "./PlotGrid";
import Histogram from "./Histogram";
import PlotBackground from "./PlotBackground";
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
  selectXHasCustomRange,
  selectXValuesWithoutHidden,
} from "../selectors";
import {
  selectShowHistogram,
  selectUnselectedBorderSize,
  selectFontSize,
  selectFontFamily,
  selectShowGrid,
  selectAutoScale,
} from "../scatterplotSlice";
import { selectHiddenSimulations, setSelectedSimulations } from "../dataSlice";
import * as d3 from "d3v7";

type PSHistogramProps = {};

const PSHistogram: React.FC<PSHistogramProps> = (props) => {
  const dispatch = useDispatch();
  const show_histogram = useSelector(selectShowHistogram);
  // Making a copy of the x_scale to avoid mutating the selector since we will be modifying the scale's domain
  const x_scale = useSelector(selectXScale).copy();
  const colormap = useSelector(selectColormap);
  const y_scale_range = useSelector(selectYScaleRange);
  const x_ticks = useSelector(selectXTicks);
  const y_ticks = useSelector(selectYTicks);
  const x_values = useSelector(selectXValues);
  const x_values_without_hidden = useSelector(selectXValuesWithoutHidden);
  const histogram_bar_stroke_width = useSelector(selectUnselectedBorderSize);
  const font_size = useSelector(selectFontSize);
  const font_family = useSelector(selectFontFamily);
  const x_label_y = X_LABEL_VERTICAL_OFFSET;
  const x_label_x = useSelector(selectXLabelX);
  const x_name = useSelector(selectXColumnName);
  const y_label_y = useSelector(selectYLabelY);
  const show_grid = useSelector(selectShowGrid);
  const plot_grid_color = slycat_color_maps.get_plot_grid_color(colormap);
  const histogram_bar_color = slycat_color_maps.get_histogram_bar_color(colormap);
  const background = slycat_color_maps.get_background(colormap).toString();
  const x_has_custom_range = useSelector(selectXHasCustomRange);
  const auto_scale = useSelector(selectAutoScale);
  const hidden_simulations = useSelector(selectHiddenSimulations);

  const handleBinClick = (bin: {
    range: number[];
    count: number;
    index: number;
    bins_length: number;
    data: d3.Bin<number, number>;
  }) => {
    // Is this the last bin?
    const is_last_bin = bin.index === bin.bins_length - 1;
    // Find the min and max values of the bin
    const min = bin.range[0];
    const max = bin.range[1];
    // Find the indices of the values in the bin
    const indices_matching_bin = x_values.reduce((acc, value, index) => {
      // Skip if index is in hidden_simulations
      if (hidden_simulations.includes(index)) {
        return acc;
      }
      // max value is inclusive for the last bin
      if (value >= min && (is_last_bin ? value <= max : value < max)) {
        acc.push(index);
      }
      return acc;
    }, []);
    dispatch(setSelectedSimulations(indices_matching_bin));
  };

  // Only render the component if show_histogram is true
  if (!show_histogram) {
    return null;
  }

  const bin = d3
    .bin()
    .value((d: number | string) => d)
    // Setting the number of bins to be the same as the number of ticks
    // so that each tick has its own bin.
    .thresholds(x_ticks);
  // Other options for setting the number of bins by using supported threshold generators
  // .thresholds(d3.thresholdFreedmanDiaconis)
  // .thresholds(d3.thresholdScott)
  // .thresholds(d3.thresholdSturges)

  // Not specifying domain unless a custom variable range has been set by the user
  // for the current x variable because
  // "If the default extent domain is used and the thresholds are specified as a count
  // (rather than explicit values), then the computed domain will be niced such that all bins are uniform width."
  // https://d3js.org/d3-array/bin#bin_domain
  if (x_has_custom_range) {
    bin.domain(x_scale.domain()).thresholds(x_scale.ticks(x_ticks));
  }

  const bins_without_hidden = bin(x_values_without_hidden);
  const bins_with_hidden = bin(x_values);

  // Declare the y (vertical position) scale.
  const y_scale = d3
    .scaleLinear()
    .domain([0, d3.max(bins_without_hidden, (d) => d.length)])
    .range(y_scale_range);

  // Adjusting x_scale domain to match the bins.
  // With auto_scale true, we use bins without hidden values to set the domain.
  // But if it's false, we set it to match bins of x_values, not x_values_without_hidden.
  const bins_for_x_scale_domain = auto_scale ? bins_without_hidden : bins_with_hidden;
  x_scale.domain([
    bins_for_x_scale_domain[0].x0,
    bins_for_x_scale_domain[bins_for_x_scale_domain.length - 1].x1,
  ]);

  return (
    <>
      <PlotBackground background={background} />
      {/* Only show PlotGrid if show_grid is true */}
      {show_grid ? (
        <PlotGrid
          x_scale={x_scale}
          y_scale={y_scale}
          x_ticks={0}
          y_ticks={y_ticks}
          colormap={colormap}
          plot_grid_color={plot_grid_color}
        />
      ) : null}
      <Histogram
        x_scale={x_scale}
        y_scale={y_scale}
        y_scale_range={y_scale_range}
        bins={bins_without_hidden}
        x_ticks={x_ticks}
        y_ticks={y_ticks}
        histogram_bar_color={histogram_bar_color}
        histogram_bar_stroke_width={histogram_bar_stroke_width}
        font_size={font_size}
        font_family={font_family}
        x_label_x={x_label_x}
        x_label_y={x_label_y}
        x_name={x_name}
        y_label_y={y_label_y}
        colormap={colormap}
        y_label_horizontal_offset={Y_LABEL_HORIZONTAL_OFFSET}
        handleBinClick={handleBinClick}
      />
    </>
  );
};

export default PSHistogram;
