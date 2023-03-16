import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app";

const timeseries_model = createRoot(document.getElementById("timeseries-model"));
timeseries_model.render(<App />);
