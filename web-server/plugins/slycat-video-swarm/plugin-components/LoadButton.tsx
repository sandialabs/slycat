import * as React from "react";
import { LoadButtonProps } from "./types";

/* Creates the JSX for the loading button
 *
 */
const LoadButton: React.FC<LoadButtonProps> = (props) => (
  <button
    className={`btn btn-outline-primary`}
    id={"pullbtn"}
    type="button"
    title={"Send a command to try manually pulling the data from the HPC and loading it the server"}
    disabled={props.disabled}
    onClick={() => props.onClick()}
  >
    {"Load"}
  </button>
);

export default LoadButton;
