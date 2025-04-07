/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import React from "react";
import { createRoot } from "react-dom/client";
import ShareModel from "./ShareModel";
import ko from "knockout";

export default {
  viewModel: {
    createViewModel: function (params: any, componentInfo: { element: HTMLElement }) {
      console.log("ShareModel createViewModel called with element:", componentInfo.element);

      // When the component is disposed, we need to cleanup the React root
      ko.utils.domNodeDisposal.addDisposeCallback(componentInfo.element, function () {
        console.log("ShareModel component being disposed");
        // React cleanup would happen here if needed
      });

      // Schedule React rendering in the next tick to ensure DOM is ready
      setTimeout(function () {
        console.log("ShareModel rendering React component");
        const root = createRoot(componentInfo.element);
        root.render(React.createElement(ShareModel));
      }, 0);

      // Return the viewModel
      return {
        // Any viewModel properties would go here
      };
    },
  },
  template: '<div style="height: 100%"></div>',
};
