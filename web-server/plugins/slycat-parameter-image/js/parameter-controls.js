/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC .
   Under the terms of Contract  DE-NA0003525 with National Technology and Engineering
   Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

import React from "react";
import ReactDOM from "react-dom";
import "jquery-ui";
import ControlsBar from './Components/controls-bar';
import "bootstrap";

$.widget("parameter_image.controls",
{
  options:
  {
    mid : null,
    model_name : null,
    aid : null,
    metadata : null,
    "x-variable" : null,
    "y-variable" : null,
    "image-variable" : null,
    "color-variable" : null,
    "auto-scale" : true,
    x_variables : [],
    y_variables : [],
    image_variables : [],
    color_variables : [],
    rating_variables : [],
    category_variables : [],
    selection : [],
    hidden_simulations : [],
    indices : [],
    disable_hide_show : false,
    open_images : [],
    "video-sync" : false,
    "video-sync-time" : 0,
  },

  _create: function()
  {
    var self = this;

    const x_axis_dropdown_items = [];
    for(let x_variable of this.options.x_variables) {
      x_axis_dropdown_items.push({
        key: x_variable, 
        name: self.options.metadata['column-names'][x_variable]
      });
    }

    const y_axis_dropdown_items = [];
    for(let y_variable of this.options.y_variables) {
      y_axis_dropdown_items.push({
        key: y_variable, 
        name: self.options.metadata['column-names'][y_variable]
      });
    }

    const color_variable_dropdown_items = [];
    for(let color_variable of this.options.color_variables) {
      color_variable_dropdown_items.push({
        key: color_variable, 
        name: self.options.metadata['column-names'][color_variable]
      });
    }

    const media_variable_dropdown_items = [];
    media_variable_dropdown_items.push({key: -1, name: "None"});
    for(let media_variable of this.options.image_variables) {
      media_variable_dropdown_items.push({
        key: media_variable, 
        name: self.options.metadata['column-names'][media_variable]
      });
    }

    const dropdowns = [
      {
        id: 'x-axis-dropdown',
        label: 'X Axis',
        title: 'Change X Axis Variable', 
        state_label:'x_variable',
        trigger: 'x-selection-changed',
        items: x_axis_dropdown_items,
        selected: self.options["x-variable"],
      },
      {
        id: 'y-axis-dropdown',
        label: 'Y Axis',
        title: 'Change Y Axis Variable', 
        state_label:'y_variable',
        trigger: 'y-selection-changed',
        items: y_axis_dropdown_items,
        selected: self.options["y-variable"],
      },
      {
        id: 'color-dropdown',
        label: 'Point Color',
        title: 'Change Point Color', 
        state_label:'color_variable',
        trigger: 'color-selection-changed',
        items: color_variable_dropdown_items,
        selected: self.options["color-variable"],
      },
      {
        id: 'image-dropdown',
        label: 'Media Set',
        title: 'Change Media Set Variable', 
        state_label:'media_variable',
        trigger: 'images-selection-changed',
        items: media_variable_dropdown_items,
        selected: self.options["image-variable"],
      },
    ];

    const controls_bar = <ControlsBar element={self.element} 
      dropdowns={dropdowns}
      auto_scale={self.options["auto-scale"]} 
      hidden_simulations={self.options.hidden_simulations}
      disable_hide_show={self.options.disable_hide_show}
      open_images={self.options.open_images}
      selection={self.options.selection}
      mid={self.options.mid}
      aid={self.options.aid}
      model_name={self.options.model_name}
      metadata={self.options.metadata}
      indices={self.options.indices}
      media_variables={self.options.image_variables}
      rating_variables={self.options.rating_variables}
      video_sync={self.options["video-sync"]}
      video_sync_time={self.options["video-sync-time"]}
    />;

    self.ControlsBarComponent = ReactDOM.render(
      controls_bar,
      document.getElementById('react-controls')
    );

  },

  _setOption: function(key, value)
  {
    var self = this;

    //console.log("sparameter_image.variableswitcher._setOption()", key, value);
    this.options[key] = value;

    if(key == "x-variable")
    {
      self.ControlsBarComponent.setState({x_variable: Number(self.options["x-variable"])});
    }
    else if(key == "y-variable")
    {
      self.ControlsBarComponent.setState({y_variable: Number(self.options["y-variable"])});
    }
    else if(key == "image-variable")
    {
      self.ControlsBarComponent.setState({media_variable: Number(self.options["image-variable"])});
    }
    else if(key == "color-variable")
    {
      self.ControlsBarComponent.setState({color_variable: Number(self.options["color-variable"])});
    }
    else if(key == 'selection')
    {
      self.ControlsBarComponent.setState({selection: self.options.selection.slice()});
    }
    else if(key == 'hidden_simulations')
    {
      self.ControlsBarComponent.setState({hidden_simulations: self.options.hidden_simulations.slice()});
    }
    else if(key == 'open_images')
    {
      self.ControlsBarComponent.setState({open_images: self.options.open_images.slice()});
    }
    else if(key == 'disable_hide_show')
    {
      self.ControlsBarComponent.setState({disable_hide_show: self.options.disable_hide_show});
    }
    else if(key == 'video-sync-time')
    {
      self.ControlsBarComponent.setState({
        video_sync_time: self.options['video-sync-time'],
        video_sync_time_value: self.options['video-sync-time'],
      });
    }
  },
});