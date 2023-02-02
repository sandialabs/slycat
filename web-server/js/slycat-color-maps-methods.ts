/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC. 
Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  
retains certain rights in this software. */

import d3 from "d3";

export default {
  // Return a d3 rgb object with the suggested background color for the given color map.
  get_background: function(name: string): d3.RGBColor
  {
    if(name === undefined)
      name = this.options.colormap;
    return this.color_maps[name].background;
  },

  // Return the null color value for the given color map.
  get_null_color: function(name: string): string
  {
    if(name === undefined)
      name = this.options.colormap;
    return this.color_maps[name]["null_color"];
  },

  // Return the suggested opacity value for the given color map.
  get_opacity: function(name: string): string
  {
    if(name === undefined)
      name = this.options.colormap;
    return this.color_maps[name].opacity;
  },

  // Return a d3 linear color scale with the current color map for the domain [0, 1].
  // Callers should modify the domain by passing a min and max to suit their own needs.  
  get_color_scale: function(name: string, min: number, max: number)
  {
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
  get_color_map: function(name: string, min: number, max: number)
  {
    return this.get_color_scale(name, min, max);
  },

  // Return a d3 ordinal color scale with the current color map for the domain [0, 1].
  // Callers should modify the domain by passing an array of values to suit their own needs. 
  get_color_scale_ordinal: function(name: string, values: number[])
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
  get_color_map_ordinal: function(name: string, values: number[])
  {
    return this.get_color_scale_ordinal(name, values);
  },

  get_gradient_data: function(name: string)
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

  setUpColorMapsForAllColumns: function(name: string, columns: {columnMin: number, columnMax: number, colorMap}[])
  {
    for(var j = 0; j != columns.length; ++j)
    {
      columns[j].colorMap = this.get_color_scale(name, columns[j].columnMin, columns[j].columnMax);
    }
  },
}
