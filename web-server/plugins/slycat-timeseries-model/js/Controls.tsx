import React from "react";

type Props = {
  modelId: string;
};

export const Controls: React.FC<Props> = (props) => {
  const { modelId } = props;

  return (
    <div id="cluster-pane" className="ui-layout-north bootstrap-styles">
      <div className="d-flex justify-content-center align-items-center mx-2" id="controls">
        <div id="general-controls" className="btn-group"></div>
        <div id="color-switcher" className="btn-group ml-3"></div>
      </div>
      <div className="load-status"></div>
    </div>
  );
};

export default Controls;
