import * as React from "react";
import ConnectModal from "components/ConnectModal.tsx";
import ControlsButton from "components/ControlsButton.js";
import LoadButton from "./LoadButton.tsx";
import { LoadingPageButtonsProps } from "./types.ts";

/**
 *  loads the buttons for the loading page for timeseries model
 * @param props 
 */
const LoadingPageButtons: React.FC<LoadingPageButtonsProps> = (props) => {
  // wait until all the jquery stuff is loaded
  $( document ).ready(function( $ ) {
    // enable tooltips
    $('[data-toggle="tooltip"]').tooltip();
  })
  return (
    <React.Fragment>
      <ConnectModal
        hostname={props.hostname}
        modalId={props.modalId}
        callBack={props.connectModalCallBack}
      />
      <button
        className="btn btn-outline-primary"
        type="button"
        data-toggle="collapse"
        data-target="#collapseJobCodes"
        aria-expanded="false"
        aria-controls="collapseJobCodes"
        title="Job status will be in the grey info block below after loading from HPC"
      >
        Job status meanings
      </button>
      <button
        className={`btn btn btn-outline-primary`}
        id={"pullbtn"}
        type="button"
        title={"Send command to the HPC to cancel the current job if the status is pending or running"}
        disabled={
          !props.jobStatus.includes("PENDING") && !props.jobStatus.includes("RUNNING")
        }
        onClick={() => props.cancelJob()}
      >
        {"Cancel job"}
      </button>
      <LoadButton
        disabled={!props.jobStatus.includes("COMPLETED")}
        onClick={() => props.pullHPCData()}
      />
      {props.modelShow && !props.sessionExists && (
        <ControlsButton
          label="Connect"
          title={"Connect to HPC"}
          data_toggle="modal"
          data_target={"#" + props.modalId}
          button_style={"btn btn-outline-primary"}
          id="controls-button-death"
        />
      )}
    </React.Fragment>
  );
};

export default LoadingPageButtons;
