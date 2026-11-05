/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import React from "react";
import { createRoot } from "react-dom/client";
import ko from "knockout";
import EditProject from "./EditProject";

export default {
  viewModel: {
    createViewModel: function (params: any, componentInfo: { element: HTMLElement }) {
      const root = createRoot(componentInfo.element);
      const project = ko.toJS(params.projects()[0]);
      root.render(React.createElement(EditProject, { project }));
      ko.utils.domNodeDisposal.addDisposeCallback(componentInfo.element, function () {
        root.unmount();
      });
      return {};
    },
  },
  template: "<div></div>",
};
