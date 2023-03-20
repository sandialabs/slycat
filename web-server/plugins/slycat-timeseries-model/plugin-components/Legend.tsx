import React from "react";

type Props = {
  modelId: string;
};

export const Legend: React.FC<Props> = (props) => {
  const { modelId } = props;

  return (
    <div id="legend-pane" className="ui-layout-east">
      <div className="load-status"></div>
      <div id="legend"></div>
    </div>
  );
};

export default Legend;
