import React from "react";

type Props = {
  modelId: string;
};

export const Dendrogram: React.FC<Props> = (props) => {
  const { modelId } = props;

  return (
    <div id="dendrogram-pane" className="ui-layout-west">
      <div id="dendrogram-sparkline-backdrop"></div>
      <div className="load-status"></div>
      <svg id="dendrogram-viewer" width="100%" height="100%">
        <defs>
          <linearGradient id="subtree-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7767b0" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>
        </defs>
      </svg>
      <div id="dendrogram-controls" className="bootstrap-styles">
        <div id="dendrogram-general-controls" className="btn-group">
          {/* <!-- The following div is only necessary when there is more than one button, so leaving commented out for when we add another button here --> */}
          {/* <!-- <div className="btn-group btn-group-xs"> --> */}
          <button
            className="outputs btn btn-outline-dark btn-sm dropdown-toggle"
            type="button"
            id="outputs-dropdown"
            data-toggle="dropdown"
            aria-expanded="false"
            title="Change Outputs"
          >
            <span className="buttonLabel">Outputs</span>
          </button>
          <div
            className="outputs dropdown-menu"
            role="menu"
            aria-labelledby="outputs-dropdown"
          ></div>
          {/* <!-- </div> -->  */}
        </div>
      </div>
    </div>
  );
};

export default Dendrogram;
