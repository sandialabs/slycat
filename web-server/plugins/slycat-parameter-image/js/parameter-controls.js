/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC .
   Under the terms of Contract  DE-NA0003525 with National Technology and Engineering
   Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

import React from "react";
import { createRoot } from "react-dom/client";
import "jquery-ui";
import PSControlsBar from "./Components/PSControlsBar";
import "bootstrap";
import $ from "jquery";

$.widget("parameter_image.controls", {
  options: {
    mid: null,
    model_name: null,
    model: null,
    aid: null,
    x_variables: [],
    y_variables: [],
    axes_variables: [],
    image_variables: [],
    color_variables: [],
    indices: [],
  },

  _create: function () {
    var self = this;

    const controls_bar = (
      <PSControlsBar
        store={window.store}
        element={self.element}
        axes_variables={self.options.axes_variables}
        indices={self.options.indices}
        mid={self.options.mid}
        aid={self.options.aid}
        model={self.options.model}
        model_name={self.options.model_name}
        x_variables={self.options.x_variables}
        y_variables={self.options.y_variables}
        image_variables={self.options.image_variables}
        color_variables={self.options.color_variables}
      />
    );
    const react_controls_root = createRoot(document.getElementById("react-controls"));
    react_controls_root.render(controls_bar);

    $("#controls-pane").on("show.bs.dropdown", function (event) {
      // Get all dropdown menus inside this element
      let menus = $(".dropdown-menu", this);
      // Get the container that holds the model's panes
      let container = $(".ui-layout-container").first();
      // Set the max height of each menu to 70px less than the container.
      // This prevents the menus from sticking out beyond the page and allows
      // them to be scrollable when they are too long.
      menus.css("max-height", container.height() - 70 + "px");
    });
  },

  _setOption: function (key, value) {},
});
