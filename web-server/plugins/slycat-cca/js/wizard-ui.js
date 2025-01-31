/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
import React from "react";
import { createRoot } from "react-dom/client";
// import TimeseriesWizard from "components/timeseries-wizard/TimeseriesWizard.tsx";
import markings from "js/slycat-selectable-markings";
import { CCAWizard } from ".//components/CCAWizard.tsx"
import ccaWizardUI from "../wizard-ui.html";

function constructor(params) {
  console.dir(params)
  const react_wizard_root = createRoot(document.querySelector(".react-wizard"));
  react_wizard_root.render(
    <CCAWizard></CCAWizard>
  );

  // return an empty component since we are just using it to render react
  return {};
}

export default {
  viewModel: constructor,
  template: ccaWizardUI,
};
