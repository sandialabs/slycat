/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

import d3 from "js/d3.min";
import "jquery-ui";
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import ColorBar from './Components/color-bar';
import ColorButton from './Components/color-bar-redux.js';
import { createStore } from 'redux';
import helloWorldReducer from './Reducers/hello-world-reducer';
import colorSwitcherReducer from './Reducers/color-switcher-reducer';
import COLOR_MAP from './Components/color-map.js';
import COLOR_LABELS from './Components/color-labels.js';


$.widget("slycat.colorswitcher",
{
  options:
  {
    colormap : "day",
    selection: null,
  },
  _create: function()
  {
    var self = this;

    this.color_maps = COLOR_MAP;


    const dropdown = [
                {
                    id: 'color-switcher',
                    label: 'Color',
                    title: 'Change color scheme',
                    state_label: 'color',
                    trigger: 'colormap-changed',
                    items: COLOR_LABELS,
                    selected: self.options.colormap,
                    single: true,
                }];

    const helloWorldStore = createStore(helloWorldReducer);
    const colorSwitcherStore = createStore(colorSwitcherReducer);
    
    const color_bar = <ColorBar element={self.element}
        dropdown={dropdown}
        selection={self.options.selection}
        />;


    //const redux_test = <Button store={helloWorldStore}/>
    const color_switcher_redux = <ColorButton store={colorSwitcherStore} element={self.element} dropdown={dropdown} selection={self.options.selection}
    />;

    //self.redux_test = ReactDOM.render(redux_test, document.getElementById('redux-test'));

    self.color_bar = ReactDOM.render(color_bar, document.getElementById('color-switcher'));
    self.color_switcher_redux = ReactDOM.render(color_switcher_redux, document.getElementById('redux-test'));

    var all_color_stops = [];
    var all_background_color = [];

    $.each(this.color_maps, function(key, value) {

        var gradient_data = self.get_gradient_data(key);
        var color_stops = [];
        for (var i = 0; i < gradient_data.length; i++) {
            color_stops.push(gradient_data[i].color + " " + gradient_data[i].offset + "%");
        }
        var background_color = self.get_background(key);

        all_color_stops.push(color_stops);
        all_background_color.push(background_color);
    });

    for (var i = 0; i < all_color_stops.length; i++) {
      $("#color-switcher a").eq(i)
            .css({
                "background-image": "linear-gradient(to bottom, " + all_color_stops[i].join(", ") + "), linear-gradient(to bottom, " + all_background_color[i] + ", " + all_background_color[i] + ")",
                "background-size": "5px 75%, 50px 100%",
                "background-position": "right 10px center, right 5px center",
                "background-repeat": "no-repeat, no-repeat",
                "padding-right": "70px",
            });
    }
  },

  _setOption: function(key, value)
  {

    if(key == "color")
    {
      self.color_bar.setState({colormap: Number(self.options.colormap)});
    }
  },

  // Return a d3 rgb object with the suggested background color for the given color map.
  get_background: function(name)
  {
    if(name === undefined)
      name = this.options.colormap;
    return this.color_maps[name].background;
  },

  // Return the null color value for the given color map.
  get_null_color: function(name)
  {
    if(name === undefined)
      name = this.options.colormap;
    return this.color_maps[name]["null_color"];
  },

  // Return the suggested opacity value for the given color map.
  get_opacity: function(name)
  {
    if(name === undefined)
      name = this.options.colormap;
    return this.color_maps[name].opacity;
  },

  // Return a d3 linear color scale with the current color map for the domain [0, 1].
  // Callers should modify the domain by passing a min and max to suit their own needs.  
  get_color_scale: function(name, min, max)
  {
    name = this.color_bar.get_selected_colormap();
    if(name === undefined)
      name = this.options.colormap;
    if(min === undefined)
      min = 0.0;
    if(max === undefined)
      max = 1.0;
    var domain = []
    var domain_scale = d3.scale.linear()
      .domain([0, this.color_maps[name].colors.length-1])
      .range([min, max]);
    for(var i in this.color_maps[name].colors)
      domain.push(domain_scale(i));
    return d3.scale.linear().domain(domain).range(this.color_maps[name].colors);
  },

  // Deprecated
  get_color_map: function(name, min, max)
  {
    return this.get_color_scale(name, min, max);
  },

  // Return a d3 ordinal color scale with the current color map for the domain [0, 1].
  // Callers should modify the domain by passing an array of values to suit their own needs. 
  get_color_scale_ordinal: function(name, values)
  {
    if(name === undefined)
      name = this.options.colormap;
    if(values === undefined)
      values = [0, 1];

    var tempOrdinal = d3.scale.ordinal().domain(values).rangePoints([0, 100], 0);
    var tempColorscale = this.get_color_scale(name, 0, 100);
    var rgbRange = [];
    for(var i=0; i<values.length; i++)
    {
      rgbRange.push( tempColorscale( tempOrdinal(values[i]) ) );
    }
    return d3.scale.ordinal().domain(values).range(rgbRange);
  },

  // Deprecated
  get_color_map_ordinal: function(name, values)
  {
    return this.get_color_scale_ordinal(name, values);
  },

  get_gradient_data: function(name)
  {
    var self = this;

    if(name === undefined)
      name = this.options.colormap;

    var colors = self.color_maps[name]["colors"];
    var length = colors.length;
    var data = [];
    for(var i=0; i < length; i++){
      data.push({offset: i*(100/(length-1)), color: colors[length-1-i],});
    }
    return data;
  },

  setUpColorMapsForAllColumns: function(name, columns)
  {
    for(var j = 0; j != columns.length; ++j)
    {
      columns[j].colorMap = this.get_color_scale(name, columns[j].columnMin, columns[j].columnMax);
    }
  }


});