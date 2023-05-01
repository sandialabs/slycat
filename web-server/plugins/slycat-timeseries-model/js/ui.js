// @ts-check
import React from "react";
import { createRoot } from "react-dom/client";
import App from "../plugin-components/App";
import { Provider, useDispatch } from "react-redux";
import store from "./store";

// Creating this wrapper component allows us to use the useDispatch hook.
// Need to pass this hook, along with the store's subscribe and getState functions
// down the chain of components to non-React legacy code so it can react to
// state changes and dispatch actions to the store.
// Remove this once timeseries-model is fully Reactified.
const TimeseriesAppWrapper = () => {
  // This is a hook that allows us to dispatch actions to the redux store
  const dispatch = useDispatch();
  // We are not supposed to pass the store to components, so we need to pass
  // its subscribe and getState functions down the chain of components instead.
  const subscribe = store.subscribe;
  const getState = store.getState;

  return <App get_state={getState} subscribe={subscribe} dispatch={dispatch} />;
};

// @ts-ignore
const timeseries_model = createRoot(document.getElementById("timeseries-model"));
timeseries_model.render(
  <Provider store={store}>
    <TimeseriesAppWrapper />
  </Provider>
);
