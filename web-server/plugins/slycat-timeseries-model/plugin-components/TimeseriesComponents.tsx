// timeseries.js is not typescript, so ignoring typechecking it for now
// @ts-ignore
import initialize_timeseries_model from "../js/timeseries";

import React, { useEffect, useRef } from "react";
import LoadingPage from "../plugin-components/LoadingPage";
import Controls from "./Controls";
import Dendrogram from "./Dendrogram";
import Waveforms from "./Waveforms";
import Legend from "./Legend";
import Table from "./Table";
import type { RootState, AppSubscribe, AppDispatch } from "../js/store";
import { TableMetadataType } from "types/slycat";

type Props = {
  dispatch: AppDispatch;
  get_state: () => RootState;
  subscribe: AppSubscribe;
  model: {
    _id: string;
    state: string;
    "artifact:jid": string;
    "artifact:hostname": string;
    name: string;
  };
  clusters: [] | undefined;
  tableMetadata: TableMetadataType;
};

/**
 * determine if we should mount the loading page or the actually timeseries model
 *
 * @param props see Props type
 * @returns JSX
 */
const TimeseriesComponents = (props: Props) => {
  const { model, clusters, tableMetadata, dispatch, get_state, subscribe } = props;
  const initializedRef = useRef(false);

  // Must not call initialize (and its Redux dispatches) during render — that
  // triggers "Cannot update a component while rendering a different component".
  useEffect(() => {
    if (
      initializedRef.current ||
      model.state !== "closed" ||
      !clusters ||
      !tableMetadata
    ) {
      return;
    }
    initializedRef.current = true;
    initialize_timeseries_model(dispatch, get_state, subscribe, model, clusters, tableMetadata);
  }, [model, clusters, tableMetadata, dispatch, get_state, subscribe]);

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
      <Controls modelId={model._id} aid="inputs" model_name={model.name} metadata={tableMetadata} />
      <Dendrogram modelId={model._id} />
      <Waveforms modelId={model._id} />
      <Legend />
      <Table modelId={model._id} />
    </>
  );
};

export default TimeseriesComponents;
