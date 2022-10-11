/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC .
   Under the terms of Contract  DE-NA0003525 with National Technology and Engineering
   Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

import React from "react";
import ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import "jquery-ui";
import ControlsBar from "./Components/PSControlsBar";
import "bootstrap";
import $ from "jquery";

$.widget("parameter_image.controls", {
  options: {
    mid: null,
    model_name: null,
    model: null,
    aid: null,
    metadata: null,
    table_statistics: null,
    "x-variable": null,
    "y-variable": null,
    "image-variable": null,
    "color-variable": null,
    "auto-scale": true,
    x_variables: [],
    y_variables: [],
    axes_variables: [],
    image_variables: [],
    color_variables: [],
    rating_variables: [],
    category_variables: [],
    selection: [],
    indices: [],
    "video-sync": false,
    "video-sync-time": 0,
  },

  _create: function () {
    var self = this;

    const x_axis_dropdown_items = [];
    for (let x_variable of this.options.x_variables) {
      x_axis_dropdown_items.push({
        key: x_variable,
        name: self.options.metadata["column-names"][x_variable],
      });
    }

    const y_axis_dropdown_items = [];
    for (let y_variable of this.options.y_variables) {
      y_axis_dropdown_items.push({
        key: y_variable,
        name: self.options.metadata["column-names"][y_variable],
      });
    }

    const axes_items = [];
    for (let axes_variable of this.options.axes_variables) {
      axes_items.push({
        key: axes_variable,
        name: self.options.metadata["column-names"][axes_variable],
      });
    }

    const color_variable_dropdown_items = [];
    for (let color_variable of this.options.color_variables) {
      color_variable_dropdown_items.push({
        key: color_variable,
        name: self.options.metadata["column-names"][color_variable],
      });
    }

    const media_variable_dropdown_items = [];
    media_variable_dropdown_items.push({ key: -1, name: "None" });
    for (let media_variable of this.options.image_variables) {
      media_variable_dropdown_items.push({
        key: media_variable,
        name: self.options.metadata["column-names"][media_variable],
      });
    }

    const dropdowns = [
      {
        id: "x-axis-dropdown",
        label: "X",
        title: "Change X Axis Variable",
        state_label: "x_index",
        trigger: "x-selection-changed",
        items: x_axis_dropdown_items,
        selected: self.options["x-variable"],
      },
      {
        id: "y-axis-dropdown",
        label: "Y",
        title: "Change Y Axis Variable",
        state_label: "y_index",
        trigger: "y-selection-changed",
        items: y_axis_dropdown_items,
        selected: self.options["y-variable"],
      },
      {
        id: "color-dropdown",
        label: "Point Color",
        title: "Change Point Color",
        state_label: "v_index",
        trigger: "color-selection-changed",
        items: color_variable_dropdown_items,
        selected: self.options["color-variable"],
      },
      {
        id: "image-dropdown",
        label: "Media",
        title: "Change Media Set Variable",
        state_label: "media_index",
        trigger: "images-selection-changed",
        items: media_variable_dropdown_items,
        selected: self.options["image-variable"],
      },
    ];

    const controls_bar_ref = React.createRef();

    const controls_bar = (
      <ControlsBar
        ref={controls_bar_ref}
        store={window.store}
        element={self.element}
        dropdowns={dropdowns}
        axes_variables={axes_items}
        auto_scale={self.options["auto-scale"]}
        selection={self.options.selection}
        pid={self.options.pid}
        mid={self.options.mid}
        aid={self.options.aid}
        model={self.options.model}
        model_name={self.options.model_name}
        metadata={self.options.metadata}
        indices={self.options.indices}
        rating_variables={self.options.rating_variables}
        video_sync={self.options["video-sync"]}
        video_sync_time={self.options["video-sync-time"]}
      />
    );
    ReactDOM.render(controls_bar, document.getElementById("react-controls"));
    // React 18 createRoot conversion breaks here 
    // const react_controls_root = createRoot(document.getElementById("react-controls"));
    // react_controls_root.render(controls_bar);

    self.ControlsBarComponent = controls_bar_ref.current;

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

  _setOption: function (key, value) {
    var self = this;

    //console.log("parameter_image.variableswitcher._setOption()", key, value);
    this.options[key] = value;
    if (key == "nothing") {
      return;
    } else if (key == "video-sync-time") {
      self.ControlsBarComponent.setState({
        video_sync_time: self.options["video-sync-time"],
        video_sync_time_value: self.options["video-sync-time"],
      });
    }
  },
});
