/*
Copyright (c) 2013, 2018 National Technology
and Engineering Solutions of Sandia, LLC . Under
the terms of Contract  DE-NA0003525 with
National Technology and Engineering Solutions
of Sandia, LLC, the U.S. Government  retains
certain rights in this software.
*/

import d3 from "d3";
import "jquery-ui";
import React from 'react';
import ReactDOM from 'react-dom';
import ControlsDropdownColor from './Components/ControlsDropdownColor';
import COLOR_MAP from './Components/color-map.js';

let rangeMin, rangeMax;

export function isValueInColorscaleRange(value, colorscale)
{
  // console.debug(`isValueInColorscaleRange with value of %o`, value);
  // Check against min and max only if value is a number
  if(Number.isFinite(value))
  {
    return rangeMin <= value && value <= rangeMax;
  }
  // otherwise check if it's in the domain
  else
  {
    return colorscale.domain().indexOf(value) != -1;
  }
}

$.widget("slycat.colorswitcher",
{
  options:
  {
    colormap : "day",
    selection: null,
  },
  _create: function()
  {
    let self = this;
    this.color_maps = COLOR_MAP;
    const dropdown = [
                {
                    id: 'color-switcher',
                    label: 'Color',
                    title: 'Change color scheme',
                    state_label: 'color',
                    trigger: 'colormap-changed',
                    selected: self.options.colormap,
                    single: true,
                }];

    const color_bar = (<ControlsDropdownColor
        element={self.element}
        dropdown={dropdown}
        selection={self.options.selection}
        />);

    self.color_bar = ReactDOM.render(color_bar, document.getElementById('color-switcher'));
  },

  _setOption: function(key, value)
  {
    let self = this;
    // console.log(`_setOption in color-switcher.js`);
    self.options[key] = value;

    if(key === "color")
    {
      self.color_bar.setState({
          colormap: Number(self.options.colormap)
      });
    }
  },

  // Return a d3 rgb object with the suggested
  // background color for the given color map.
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

  // Return the out of domain color value for the given color map.
  get_outofdomain_color: function(name)
  {
    // console.log(`get_outofdomain_color for ${this.options.colormap}`);
    if(name === undefined)
      name = this.options.colormap;
    return this.color_maps[name]["outofdomain_color"];
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
    rangeMin = min === undefined ? 0.0 : min;
    rangeMax = max === undefined ? 1.0 : max;
    let colorMapName = name === undefined ? this.options.colormap : this.color_bar.get_selected_colormap();

    let domain = [];
    let domain_scale = d3.scale.linear()
          .domain([0, this.color_maps[colorMapName].colors.length - 1])
          .range([rangeMin, rangeMax]);
    for(let i in this.color_maps[colorMapName].colors)
      domain.push(domain_scale(i));
    return d3.scale.linear().domain(domain).range(this.color_maps[colorMapName].colors);
  },

  // Deprecated
  get_color_map: function(name, min, max)
  {
    return this.get_color_scale(name, min, max);
  },

  // Return a d3 log color scale with the current color map for the domain [0, 1].
  // Callers should modify the domain by passing a min and max to suit their own needs.  
  get_color_scale_log: function(name, min, max)
  {
    rangeMin = min === undefined ? 0.0 : min;
    rangeMax = max === undefined ? 1.0 : max;
    let colorMapName = name === undefined ? this.options.colormap : this.color_bar.get_selected_colormap();

    let domain = [];
    let domain_scale = d3.scale
      .log()
      .domain([rangeMin, rangeMax])
      .range([1, this.color_maps[colorMapName].colors.length])
      ;
    for(const index of this.color_maps[colorMapName].colors.keys())
    {
      domain.push(domain_scale.invert(index+1));
    }
    return d3.scale.log().domain(domain).range(this.color_maps[colorMapName].colors);
  },


  // Return a d3 ordinal color scale with the current color map for the domain [0, 1].
  // Callers should modify the domain by passing an array of values to suit their own needs. 
  get_color_scale_ordinal: function(name, values)
  {
    if(name === undefined)
      name = this.options.colormap;
    if(values === undefined)
      values = [0, 1];

    let tempOrdinal = d3.scale.ordinal().domain(values).rangePoints([0, 100], 0);
    let tempColorscale = this.get_color_scale(name, 0, 100);
    let rgbRange = [];
    for(let i=0; i<values.length; i++)
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
    let self = this;

    if(name === undefined)
      name = this.options.colormap;

    let colors = self.color_maps[name]["colors"];
    let length = colors.length;
    let data = [];
    for(let i=0; i < length; i++){
      data.push({offset: i*(100/(length-1)), color: colors[length-1-i],});
    }
    return data;
  },

  setUpColorMapsForAllColumns: function(name, columns)
  {
    for(let j = 0; j !== columns.length; ++j)
    {
      columns[j].colorMap = this.get_color_scale(name, columns[j].columnMin, columns[j].columnMax);
    }
  },
});