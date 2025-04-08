/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import React from "react";
import { createRoot } from "react-dom/client";
import ShareModel from "./ShareModel";

export default {
  viewModel: {
    createViewModel: function (params: any, componentInfo: { element: HTMLElement }) {
      const root = createRoot(componentInfo.element);
      root.render(React.createElement(ShareModel));

      // Return the viewModel
      return {};
    },
  },
  template: "<div></div>",
};
