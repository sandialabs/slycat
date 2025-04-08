/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import React from "react";
import { createRoot } from "react-dom/client";
import ShareModel from "./ShareModel";
import slycatClient from "js/slycat-web-client";

export default {
  viewModel: {
    createViewModel: function (params: any, componentInfo: { element: HTMLElement }) {
      const root = createRoot(componentInfo.element);
      
      // Get the model ID from the URL path (last segment)
      const pathname = window.location.pathname;
      const pathParts = pathname.split('/');
      const mid = pathParts[pathParts.length - 1];
      
      if (mid) {
        // Fetch the model data
        slycatClient.get_model_fetch(mid)
          .then((model) => {
            // Pass the model-type to the ShareModel component
            root.render(React.createElement(ShareModel, { modelType: model["model-type"] }));
          })
          .catch((error) => {
            console.error("Error fetching model:", error);
            // Render component without model type if there's an error
            root.render(React.createElement(ShareModel, {}));
          });
      } else {
        // Render component without model type if no mid is found
        root.render(React.createElement(ShareModel, {}));
      }

      // Return the viewModel
      return {};
    },
  },
  template: "<div></div>",
};
