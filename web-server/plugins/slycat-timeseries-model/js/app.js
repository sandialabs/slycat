import React from "react";
import initialize_timeseries_model from "./timeseries";

export default class App extends React.Component {
  componentDidMount() {
    initialize_timeseries_model();
  }

  render() {
    return (
      <>
        <div id="cluster-pane" className="ui-layout-north bootstrap-styles">
          <div className="d-flex justify-content-center align-items-center mx-2" id="controls">
            <div id="general-controls" className="btn-group"></div>
            <div id="color-switcher" className="btn-group ml-3"></div>
          </div>
          <div className="load-status"></div>
        </div>
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
              {/* <!-- The following div is only necessary when there is more than one button, so leaving commented out for when we add another button here -->
<!-- <div className="btn-group btn-group-xs"> -->
  <button className="outputs btn btn-outline-dark btn-sm dropdown-toggle" type="button" id="outputs-dropdown" data-toggle="dropdown" aria-expanded="false" title="Change Outputs">
    <span className="buttonLabel">Outputs</span>
  </button>
  <div className="outputs dropdown-menu" role="menu" aria-labelledby="outputs-dropdown"></div>
<!-- </div> --> */}
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
