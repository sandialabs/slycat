import React from "react";

type Props = {
  modelId: string;
};

export const Waveforms: React.FC<Props> = (props) => {
  const { modelId } = props;

  return (
    <div id="waveform-pane" className="ui-layout-center">
      <div className="load-status"></div>
      <svg id="waveform-viewer" width="100%" height="100%" style={{ position: "absolute" }}></svg>
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
  );
};

export default Waveforms;
