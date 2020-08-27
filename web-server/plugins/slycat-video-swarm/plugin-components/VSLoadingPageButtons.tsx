import * as React from "react";
import { LoadingPageButtonsProps } from "./types";

/**
 *  loads the buttons for the loading page for timeseries model
 * @param props
 */
const VSLoadingPageButtons: React.FC<LoadingPageButtonsProps> = (props) => {
  // wait until all the jquery stuff is loaded
  $(document).ready(function ($) {
    // enable tooltips
    $('[data-toggle="tooltip"]').tooltip();
  });
  return (
    <React.Fragment>
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
        className={`btn btn-outline-primary`}
        id={"pullbtn"}
        type="button"
        title={
          "Send command to the HPC to cancel the current job if the status is pending or running"
        }
        disabled={!props.jobStatus.includes("PENDING") && !props.jobStatus.includes("RUNNING")}
        onClick={() => props.cancelJob()}
      >
        {"Cancel job"}
      </button>
    </React.Fragment>
  );
};

export default VSLoadingPageButtons;
