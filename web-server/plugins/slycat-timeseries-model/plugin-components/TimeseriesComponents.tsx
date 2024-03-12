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

export default class TimeseriesComponents extends React.Component<Props> {
  componentDidMount() {
    if (this.props.model.state == "closed" && this.props.clusters && this.props.tableMetadata) {
      initialize_timeseries_model(
        this.props.dispatch,
        this.props.get_state,
        this.props.subscribe,
        this.props.model,
        this.props.clusters,
        this.props.tableMetadata
      );
    }
  }

  render() {
    const { model, clusters, tableMetadata, dispatch, get_state, subscribe } = this.props;

    // Show loading page if model is not ready
    if (model["state"] === "waiting" || model["state"] === "running") {
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
}
