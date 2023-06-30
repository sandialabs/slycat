import React from "react";
import { useSelector } from "react-redux";
import { selectColormap } from "../selectors";
import slycat_color_maps from "js/slycat-color-maps";

type PlotBackgroundProps = {};

const PlotBackground: React.FC<PlotBackgroundProps> = (props) => {
  const colormap = useSelector(selectColormap);

  return (
    <div
      className="plot-background"
      style={{ background: slycat_color_maps.get_background(colormap).toString() }}
    ></div>
  );
};

export default PlotBackground;
