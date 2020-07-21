/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC. 
Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  
retains certain rights in this software. */

import d3 from "d3";
import vtkColorMaps from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction/ColorMaps.json';

let subset = [
  "Cool to Warm",
  "Cool to Warm (Extended)",
  "Black-Body Radiation",
  "X Ray",
  "Inferno (matplotlib)",
  "Black, Blue and White",
  "Blue Orange (divergent)", // This one seems to be missing in the vtk ColorMaps.json file
  "Viridis (matplotlib)",
  "Gray and Red", // This one seems to be missing in the vtk ColorMaps.json file
  "Linear Green (Gr4L)",
  "Cold and Hot",
  "Blue - Green - Orange",  // This one seems to be missing in the vtk ColorMaps.json file
  "Rainbow Desaturated",
  "Yellow - Gray - Blue",  // This one seems to be missing in the vtk ColorMaps.json file
  "Rainbow Uniform", // This one seems to be missing in the vtk ColorMaps.json file
  "jet",
];

// Filtering vtk.js colormaps to only include the ones above
let color_maps = {};
vtkColorMaps
  .filter((p) => p.RGBPoints)
  // .filter((p) => p.ColorSpace !== 'CIELAB')
  .filter((p) => subset.includes(p.Name))
  .forEach((p) => {
    let colors = [];
    let rgbpoints = p.RGBPoints.slice();
    while(rgbpoints.length > 0)
    {
      let x = rgbpoints.splice(0,1)[0];
      let r = rgbpoints.splice(0,1)[0] * 255;
      let g = rgbpoints.splice(0,1)[0] * 255;
      let b = rgbpoints.splice(0,1)[0] * 255;
      colors.push(d3.rgb(r, g, b));
    }
    color_maps[p.Name] = {
      label: p.Name,
      background: d3.rgb(128, 128, 128),
      null_color: "rgb(75,75,75)",
      opacity: "0.5",
      colors: colors,
    };
  })
  ;

export default {
  color_maps: color_maps,
  
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
  },
}
