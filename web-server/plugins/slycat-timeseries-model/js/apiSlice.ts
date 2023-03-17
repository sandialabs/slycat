// Import the RTK Query methods from the React-specific entry point
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import api_root from "js/slycat-api-root";

// Define our single API slice object
export const apiSlice = createApi({
  // The cache reducer expects to be added at `state.api` (already default - this is optional)
  reducerPath: "api",
  // All of our requests will have URLs starting with the value of api_root
  baseQuery: fetchBaseQuery({ baseUrl: api_root }),
  // The "endpoints" represent operations and requests for this server
  endpoints: (builder) => ({
    // The `getModel` endpoint is a "query" operation that returns model data
    getModel: builder.query({
      // The URL for the request is the value of api_root, followed by 'models'
      query: (modelId) => `models/${modelId}`,
    }),
    getTableMetadata: builder.query({
      query: (modelId) => `models/${modelId}/tables/inputs/arrays/0/metadata?index=Index`,
    }),
  }),
});

// Export auto-generated hooks
export const { useGetModelQuery, useGetTableMetadataQuery } = apiSlice;
