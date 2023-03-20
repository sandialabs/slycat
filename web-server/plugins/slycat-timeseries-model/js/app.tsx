import React from "react";
import TimeseriesComponents from "../plugin-components/TimeseriesComponents";
import { useGetModelQuery, useGetTableMetadataQuery, useGetClustersQuery } from "./apiSlice";
import { skipToken } from "@reduxjs/toolkit/query/react";

type Props = {};

const App: React.FC<Props> = () => {
  const parsedUrl = new URL(window.location.href);
  const modelId = parsedUrl.pathname.split("/").pop();

  const {
    data: model,
    isFetching: fetchingModel,
    isSuccess: successModel,
  } = useGetModelQuery(modelId);
  const {
    data: tableMetadata,
    isFetching: fetchingTableMetadata,
    isSuccess: successTableMetadata,
  } = useGetTableMetadataQuery(successModel ? model._id : skipToken);
  const {
    data: clusters,
    isFetching: fetchingClusters,
    isSuccess: successClusters,
  } = useGetClustersQuery(successModel ? model._id : skipToken);

  // Only continue if we fetched all the data we need
  if (successModel && successTableMetadata && successClusters) {
    return <TimeseriesComponents model={model} clusters={clusters} tableMetadata={tableMetadata} />;
  }

  // If we don't get model or tableMetadata, show an error page.
  // Return null to prevent the rest of the app from rendering for now.
  return null;
};

export default App;
