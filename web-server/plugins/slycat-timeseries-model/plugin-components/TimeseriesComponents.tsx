// timeseries.js is not typescript, so ignoring typechecking it for now
// @ts-ignore
import initialize_timeseries_model from "../js/timeseries";

import React from "react";
import Controls from "../js/Controls";
import LoadingPage from "../plugin-components/LoadingPage";

type Props = {
  model: {
    _id: string;
    state: string;
    "artifact:jid": string;
    "artifact:hostname": string;
  };
  clusters: [];
  tableMetadata: {
    "column-count": number;
  };
};

export default class TimeseriesComponents extends React.Component<Props> {
  componentDidMount() {
    if (this.props.model.state == "closed")
      initialize_timeseries_model(this.props.model, this.props.clusters, this.props.tableMetadata);
  }

  render() {
    const { model, clusters, tableMetadata } = this.props;

    // Show loading page if model is not ready
    if (model["state"] === "waiting" || model["state"] === "running") {
      return (
        <LoadingPage
          modelId={model._id}
          modelState={model["state"]}
          jid={model["artifact:jid"]}
          hostname={model["artifact:hostname"] ? model["artifact:hostname"] : "missing"}
        />
      );
    }

    // Otherwise, show the model
    return (
      <>
        <Controls modelId={model._id} />
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
        <div id="waveform-pane" className="ui-layout-center">
          <div className="load-status"></div>
          <svg
            id="waveform-viewer"
            width="100%"
            height="100%"
            style={{ position: "absolute" }}
          ></svg>
          <div id="waveform-progress">
            <input className="waveformPie" value="1" readOnly />
          </div>
          <div id="waveform-selection-progress">
            <input className="waveformPie" value="1" readOnly />
          </div>
          <div id="waveform-selector-progress-wrapper">
            <div id="waveform-selector-progress">
              <input className="waveformPie" value="1" readOnly />
              Please wait while we prepare the ability to select waveforms...
            </div>
          </div>
        </div>
        <div id="legend-pane" className="ui-layout-east">
          <div className="load-status"></div>
          <div id="legend"></div>
        </div>
        <div id="table-pane" className="ui-layout-south" style={{ overflow: "auto" }}>
          <div className="load-status"></div>
          <div id="table"></div>
        </div>
      </>
    );
  }
}
