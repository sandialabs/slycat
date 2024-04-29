// timeseries.js is not typescript, so ignoring typechecking it for now
// @ts-ignore
import initialize_timeseries_model from "../js/timeseries";

import React from "react";
import LoadingPage from "../plugin-components/LoadingPage";
import Controls from "./Controls";
import Dendrogram from "./Dendrogram";
import Waveforms from "./Waveforms";
import Legend from "./Legend";
import Table from "./Table";
import type { RootState, AppSubscribe, AppDispatch } from "../js/store";

type Props = {
  dispatch: AppDispatch;
  get_state: () => RootState;
  subscribe: AppSubscribe;
  model: {
    _id: string;
    state: string;
    "artifact:jid": string;
    "artifact:hostname": string;
  };
  clusters: [] | undefined;
  tableMetadata: {
    "column-count": number;
  } | undefined;
};

/**
 * determine if we should mount the loading page or the actually timeseries model
 * 
 * @param props see Props type
 * @returns JSX
 */
const TimeseriesComponents = (props: Props) => {
  const { model, clusters, tableMetadata, dispatch, get_state, subscribe } = props;
    if (model.state == "closed" && clusters && tableMetadata) {
      initialize_timeseries_model(
        dispatch,
        get_state,
        subscribe,
        model,
        clusters,
        tableMetadata
      );
    }

    // check if we are running or wating on the cluster
    if (model["state"] === "waiting" || model["state"] === "running") {
      // Show loading page
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
        <Dendrogram modelId={model._id} />
        <Waveforms modelId={model._id} />
        <Legend modelId={model._id} />
        <Table modelId={model._id} />
      </>
    );
}

export default React.memo(TimeseriesComponents);
