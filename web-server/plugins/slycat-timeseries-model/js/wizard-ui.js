/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import React from "react";
import { createRoot } from "react-dom/client";
import ReactDOM from "react-dom";
//TODO: brought warning in just to show react can render remove later
import TimeseriesWizard from "components/timeseries-wizard/TimeseriesWizard.tsx";
import markings from "js/slycat-markings";
import timeseriesWizardUI from "../wizard-ui.html";

function constructor(params) {
  // this is where we render react into the timeseries modal
  // ReactDOM.render(
  //   <TimeseriesWizard project={params.projects()[0]} markings={markings.preselected()} />,
  //   document.querySelector(".react-wizard")
  // );
  // React 18 createRoot conversion breaks here 
  const react_wizard_root = createRoot(document.querySelector(".react-wizard"));
  react_wizard_root.render(
    <TimeseriesWizard project={params.projects()[0]} markings={markings.preselected()} />
  );

  // return an empty component since we are just using it to render react
  return {};
}

export default {
  viewModel: constructor,
  template: timeseriesWizardUI,
};
