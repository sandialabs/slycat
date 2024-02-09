import React from "react";

type PlotBackgroundProps = {
  background: string;
};

const PlotBackground: React.FC<PlotBackgroundProps> = (props) => {
  const background = props.background;

  return <div className="plot-background" style={{ background: background }}></div>;
};

export default PlotBackground;
