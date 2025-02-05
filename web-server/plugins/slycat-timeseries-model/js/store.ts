import { configureStore, PreloadedState } from "@reduxjs/toolkit";
import { apiSlice } from "./apiSlice";
import {
  dataSlice,
  SLICE_NAME as DATA_SLICE_NAME,
  initialState as dataInitialState,
} from "./services/dataSlice";
import controlsReducer, { initialState as controlsInitialState } from "./services/controlsSlice";
import modelSlice from "./services/modelSlice";
// @ts-ignore
import client from "js/slycat-web-client";
// @ts-ignore
import bookmark_manager from "js/slycat-bookmark-manager";
import _ from "lodash";

// We need to hydrate the store with the bookmarked state before rendering the app.
// First we need to get the model because the bookmark manager needs the model ID and project ID.
const parsedUrl = new URL(window.location.href);
const modelId = parsedUrl.pathname.split("/").pop();
// @ts-ignore
let modelBookmarker;
let preloadedState: PreloadedState<RootState>;

const store = client
  .get_model_fetch(modelId)
  // Create a bookmark manager for this model and project.
  .then((model: { project: string; _id: string }) =>
    bookmark_manager.create(model.project, model._id),
  )
  // Get the bookmarked state from the bookmark manager.
  .then((bookmarker: { getStateFetch(): Promise<{}> }) => {
    modelBookmarker = bookmarker;
    return bookmarker.getStateFetch();
  })
  // Create the store with the bookmarked state.
  .then(
    (bookmarkedState: {
      colormap: string;
      state: {
        controls: {
          colormap: string;
        };
        [DATA_SLICE_NAME]: {
          selected_simulations: number[];
          hidden_simulations: number[];
          cluster_index: number;
          v_indices: number[];
        };
      };
    }) => {
      // If we have no bookmarked state, we'll use the default state.
      if (_.isEmpty(bookmarkedState)) {
        console.debug("No bookmarked state found, using default state.");
      }
      // Otherwise, if we have bookmarked Redux state, we'll use that.
      else if (bookmarkedState.state !== undefined) {
        console.debug("Found bookmarked Redux state, using that.");
        preloadedState = {
          controls: { ...controlsInitialState, ...bookmarkedState.state.controls },
          [DATA_SLICE_NAME]: { ...dataInitialState, ...bookmarkedState.state[DATA_SLICE_NAME] },
        };
      }
      // Otherwise, we have legacy bookmarked state, so we'll convert it to Redux state.
      else {
        console.debug("Found legacy bookmarked state, converting to Redux state.");
        let legacyBookmarkState = {
          controls: {
            colormap: "string",
          },
          [DATA_SLICE_NAME]: {
            selected_simulations: [],
            hidden_simulations: [],
            cluster_index: 0,
            v_indices: [],
          },
        };
        if (bookmarkedState.colormap !== undefined) {
          legacyBookmarkState.controls.colormap = bookmarkedState.colormap;
        }
        if (bookmarkedState["simulation-selection"] !== undefined) {
          legacyBookmarkState[DATA_SLICE_NAME].selected_simulations =
            bookmarkedState["simulation-selection"];
        }
        if (bookmarkedState["cluster-index"] !== undefined) {
          legacyBookmarkState[DATA_SLICE_NAME].cluster_index = bookmarkedState["cluster-index"];
        }

        let i = 0;
        while (bookmarkedState[i + "-column-index"] !== undefined) {
          legacyBookmarkState[DATA_SLICE_NAME].v_indices[i] = bookmarkedState[i + "-column-index"];
          i++;
        }

        preloadedState = {
          controls: { ...controlsInitialState, ...legacyBookmarkState.controls },
          [DATA_SLICE_NAME]: { ...dataInitialState, ...legacyBookmarkState[DATA_SLICE_NAME] },
        };
      }

      const store = configureStore({
        reducer: {
          [apiSlice.reducerPath]: apiSlice.reducer,
          controls: controlsReducer,
          model: modelSlice,
          [DATA_SLICE_NAME]: dataSlice.reducer,
        },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
        devTools: process.env.NODE_ENV !== "production",
        preloadedState,
      });

      // Save Redux state to bookmark whenever it changes
      const bookmarkReduxStateTree = () => {
        // @ts-ignore
        modelBookmarker.updateState({
          state:
            // Remove derived property from state tree because it should be computed
            // from model data each time the model is loaded. Otherwise it has the
            // potential of becoming huge. Plus we shouldn't be storing model data
            // in the bookmark, just UI state.
            // Passing 'undefined' removes it from bookmark. Passing 'null' actually
            // sets it to null, so I think it's better to remove it entirely.
            // eslint-disable-next-line no-undefined
            { ...store.getState(), api: undefined },
        });
      };
      store.subscribe(bookmarkReduxStateTree);

      return store;
    },
  );

export default await store;

// Infer the `RootState` and `AppDispatch` and `AppSubscribe` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppSubscribe = typeof store.subscribe;
