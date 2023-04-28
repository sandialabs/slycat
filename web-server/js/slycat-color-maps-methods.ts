/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC. 
Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  
retains certain rights in this software. */

import d3 from "d3";

export default {

  isValueInColorscaleRange: function (value: number, colorscale: d3.ScaleLinear | d3.ScaleLogarithmic | d3.ScaleOrdinal) {
    // console.debug(`isValueInColorscaleRange with value of %o`, value);
    // Check against min and max only if value is a number
    if (Number.isFinite(value)) {
      const rangeMin = colorscale.domain()[0];
      const rangeMax = colorscale.domain()[colorscale.domain().length - 1];
      return rangeMin <= value && value <= rangeMax;
    }
    // otherwise check if it's in the domain
    else {
      return colorscale.domain().indexOf(value) != -1;
    }
  },

  // Return a d3 rgb object with the suggested background color for the given color map.
  get_background: function (name: string): d3.RGBColor {
    if (name === undefined) name = window.store.getState().colormap;
    return this.color_maps[name].background;
  },

  // Return the null color value for the given color map.
  get_null_color: function (name: string): string {
    if (name === undefined) name = window.store.getState().colormap;
    return this.color_maps[name]["null_color"];
  },

  // Return the out of domain color value for the given color map.
  get_outofdomain_color: function (name: string): string {
    // console.log(`get_outofdomain_color for window.store.getState().colormap`);
    if (name === undefined) name = window.store.getState().colormap;
    return this.color_maps[name]["outofdomain_color"];
  },

  // Return the suggested opacity value for the given color map.
  get_opacity: function (name: string): string {
    if (name === undefined) name = window.store.getState().colormap;
    return this.color_maps[name].opacity;
  },

  // Return a d3 linear color scale with the current color map for the domain [0, 1].
  // Callers should modify the domain by passing a min and max to suit their own needs.
  get_color_scale: function (name: string, min: number, max: number) {
    // console.debug(`get_color_scale, name is %o, min is %o, max is %o`, name, min, max);
    // console.debug(`get_color_scale, this is %o`, this);
    if (name === undefined) name = window.store.getState().colormap;
    if (min === undefined) min = 0.0;
    if (max === undefined) max = 1.0;
    var domain = [];
    var domain_scale = d3.scale
      .linear()
      .domain([0, this.color_maps[name].colors.length - 1])
      .range([min, max]);
    for (var i in this.color_maps[name].colors) domain.push(domain_scale(i));
    return d3.scale.linear().domain(domain).range(this.color_maps[name].colors);
  },

  // Deprecated
  get_color_map: function (name: string, min: number, max: number) {
    return this.get_color_scale(name, min, max);
  },

  // Return a d3 log color scale with the current color map for the domain [0, 1].
  // Callers should modify the domain by passing a min and max to suit their own needs.
  get_color_scale_log: function (colormap: string, min: number, max: number) {
    const rangeMin = min === undefined ? 0.0 : min;
    const rangeMax = max === undefined ? 1.0 : max;

    let domain = [];
    let domain_scale = d3.scale
      .log()
      .domain([rangeMin, rangeMax])
      .range([1, this.color_maps[colormap].colors.length]);
    for (const index of this.color_maps[colormap].colors.keys()) {
      domain.push(domain_scale.invert(index + 1));
    }
    return d3.scale.log().domain(domain).range(this.color_maps[colormap].colors);
  },

  // Return a d3 ordinal color scale with the current color map for the domain [0, 1].
  // Callers should modify the domain by passing an array of values to suit their own needs.
  get_color_scale_ordinal: function (name: string, values: number[]) {
    if (name === undefined) name = window.store.getState().colormap;
    if (values === undefined) values = [0, 1];

    var tempOrdinal = d3.scale.ordinal().domain(values).rangePoints([0, 100], 0);
    var tempColorscale = this.get_color_scale(name, 0, 100);
    var rgbRange = [];
    for (var i = 0; i < values.length; i++) {
      rgbRange.push(tempColorscale(tempOrdinal(values[i])));
    }
    return d3.scale.ordinal().domain(values).range(rgbRange);
  },

  // Deprecated
  get_color_map_ordinal: function (name: string, values: number[]) {
    return this.get_color_scale_ordinal(name, values);
  },

  get_gradient_data: function (name: string) {
    var self = this;

    if (name === undefined) name = window.store.getState().colormap;

    var colors = self.color_maps[name]["colors"];
    var length = colors.length;
    var data = [];
    for (var i = 0; i < length; i++) {
      data.push({ offset: i * (100 / (length - 1)), color: colors[length - 1 - i] });
    }
    return data;
  },

  setUpColorMapsForAllColumns: function (
    name: string,
    columns: { columnMin: number; columnMax: number; colorMap: string }[]
  ) {
    for (var j = 0; j != columns.length; ++j) {
      columns[j].colorMap = this.get_color_scale(name, columns[j].columnMin, columns[j].columnMax);
    }
  },
};
