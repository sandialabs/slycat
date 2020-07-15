import * as React from "react";
import { LoadButtonProps } from "./types.ts";

/* Creates the JSX for the loading button
 *
 */
const LoadButton: React.FC<LoadButtonProps> = (props) => (
  <button
    className={`btn btn btn-outline-primary`}
    id={"pullbtn"}
    type="button"
    title={"load data"}
    disabled={props.disabled}
    onClick={() => props.onClick()}
  >
    {"Load"}
    <i
      style={{ paddingLeft: "5px" }}
      className="fa fa-info-circle"
      data-toggle="tooltip"
      data-placement="bottom"
      title="Send a command to try manually pulling the data from the HPC and loading it the server"
    />
  </button>
);

export default LoadButton;
