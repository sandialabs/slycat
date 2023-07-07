import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
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
} from "../selectors";
import {
  selectShowHistogram,
  selectUnselectedBorderSize,
  selectFontSize,
  selectFontFamily,
  selectShowGrid,
} from "../scatterplotSlice";
import * as d3 from "d3v7";

type PSHistogramProps = {};

const PSHistogram: React.FC<PSHistogramProps> = (props) => {
  const plotBackgroundRef = useRef<HTMLDivElement>(null);

  const x_scale = useSelector(selectXScale);

  const show_histogram = useSelector(selectShowHistogram);
  const colormap = useSelector(selectColormap);
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
  const show_grid = useSelector(selectShowGrid);
  const plot_grid_color = slycat_color_maps.get_plot_grid_color(colormap);
  const histogram_bar_color = slycat_color_maps.get_histogram_bar_color(colormap);
  const background = slycat_color_maps.get_background(colormap).toString();

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

  // Only render the component if show_histogram is true
  if (!show_histogram) {
    return null;
  }
  return (
    <>
      <PlotBackground background={background} />
      <PlotGrid
        x_scale={x_scale}
        y_scale={y_scale}
        show_grid={show_grid}
        x_ticks={0}
        y_ticks={y_ticks}
        colormap={colormap}
        plot_grid_color={plot_grid_color}
      />
      <Histogram
        x_scale={x_scale}
        y_scale={y_scale}
        y_scale_range={y_scale_range}
        bins={bins}
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
      />
    </>
  );
};

export default PSHistogram;
