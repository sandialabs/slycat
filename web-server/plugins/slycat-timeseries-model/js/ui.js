// @ts-check
import React from "react";
import { createRoot } from "react-dom/client";
import App from "../plugin-components/App";
import store from "./store";
import { Provider } from "react-redux";

// @ts-ignore
const timeseries_model = createRoot(document.getElementById("timeseries-model"));
timeseries_model.render(
  <Provider store={store}>
    <App />
  </Provider>
);
