import * as React from "react";
import { LogListProps } from "./types";
import Spinner from "components/Spinner.tsx";

  /**
   * Take items from the log and builds out dd elements
   *
   * @private
   * @memberof LoadingPage
   */
  const logBuilder = (itemList: [string]): JSX.Element[] => {
    return itemList.map((item, index) => <dd key={index.toString()}>{JSON.stringify(item)}</dd>);
  };

  /**
   * Creates the JSX for the log list
   *
   * @private
   * @memberof LoadingPage
   */
  const LogList: React.FC<LogListProps> = ({sessionExists, jobStatus, log}) => {
    let items: JSX.Element[] = logBuilder(log.logLineArray);
    return sessionExists ? (
      <dl>
        <dt>&gt;$ Job Status :: {jobStatus}</dt>
        <dt>&gt;$ Slurm run Log:</dt>
        {items.length >= 1 ? items : <Spinner />}
      </dl>
    ) : (
      <Spinner />
    );
  };
  export default LogList;