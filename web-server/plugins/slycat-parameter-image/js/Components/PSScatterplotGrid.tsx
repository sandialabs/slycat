import React from "react";
import { useSelector } from "react-redux";
import slycat_color_maps from "js/slycat-color-maps";
import PlotGrid from "./PlotGrid";
import {
  selectColormap,
  selectXScaleAxis,
  selectYScaleAxis,
  selectXTicks,
  selectYTicks,
} from "../selectors";
import { selectShowGrid } from "../scatterplotSlice";

type PSScatterplotGridProps = {};

const PSScatterplotGrid: React.FC<PSScatterplotGridProps> = (props) => {
  const colormap = useSelector(selectColormap);
  const x_scale_axis = useSelector(selectXScaleAxis);
  const y_scale_axis = useSelector(selectYScaleAxis);
  const x_ticks = useSelector(selectXTicks);
  const y_ticks = useSelector(selectYTicks);
  const show_grid = useSelector(selectShowGrid);
  const plot_grid_color = slycat_color_maps.get_plot_grid_color(colormap);

  // Only show PlotGrid if show_grid is true
  if (!show_grid) {
    return null;
  }

  return (
    <PlotGrid
      x_scale={x_scale_axis}
      y_scale={y_scale_axis}
      x_ticks={x_ticks}
      y_ticks={y_ticks}
      colormap={colormap}
      plot_grid_color={plot_grid_color}
    />
  );
};

export default PSScatterplotGrid;
