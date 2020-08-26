import * as React from "react";

/* Creates the JSX for the loading button
 *
 */
const TestReact: React.FC<{}> = (props) => (
  <button
    className={`btn btn-outline-primary`}
    id={"testbtn"}
    type="button"
    title={"Send a command to try manually pulling the data from the HPC and loading it the server"}
    disabled={false}
    onClick={() => window.alert()}
  >
    {"react test"}
  </button>
);

export default TestReact;