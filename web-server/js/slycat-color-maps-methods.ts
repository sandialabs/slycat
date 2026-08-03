/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC. 
Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  
retains certain rights in this software. */

import d3 from "d3";
import * as d3v7 from "d3v7";

const DEFAULT_COLORMAP = "night";

export default {
  // Resolve a colormap name to a known key. Undefined/empty falls back to the
  // current store selection when available; unknown bookmark or renamed maps
  // fall back to Night so callers never index a missing color_maps entry.
  resolve_colormap_name: function (name?: string | null): string {
    if (name === undefined || name === null || name === "") {
      try {
        if (typeof window !== "undefined" && (window as any).store) {
          name = (window as any).store.getState().colormap;
        }
      } catch (_err) {
        name = undefined;
      }
    }
    if (typeof name === "string" && this.color_maps[name]) {
      return name;
    }
    return DEFAULT_COLORMAP;
  },

  is_discrete: function (name: string): boolean {
    name = this.resolve_colormap_name(name);
    return this.color_maps[name]?.type === "discrete";
  },

  isValueInColorscaleRange: function (
    value: number,
    colorscale:
      | d3.ScaleLinear
      | d3.ScaleLogarithmic
      | d3.ScaleOrdinal
      | d3.ScaleQuantize
      | d3v7.ScaleLinear<d3.RGBColor, string>
      | d3v7.ScaleQuantize<d3.RGBColor>,
  ) {
    const domain = colorscale.domain();

    // Ordinal scales (string or numeric categories) have neither invert nor
    // invertExtent. Require exact domain membership so values that fall in a
    // numeric gap (e.g. 5 when domain is [3,4,6,8]) are treated as out of range
    // instead of passing a min/max check and then getting undefined from the scale.
    if (
      typeof (colorscale as any).invert !== "function" &&
      typeof (colorscale as any).invertExtent !== "function"
    ) {
      return domain.indexOf(value) !== -1;
    }

    // Continuous / quantize / time: inclusive span of domain endpoints.
    if (Number.isFinite(value) || (value as any) instanceof Date) {
      return domain[0] <= value && value <= domain[domain.length - 1];
    }
    return domain.indexOf(value) !== -1;
  },

  // Return a d3 rgb object with the suggested background color for the given color map.
  get_background: function (name: string): d3.RGBColor {
    name = this.resolve_colormap_name(name);
    return this.color_maps[name].background;
  },

  // Return the null color value for the given color map.
  get_null_color: function (name: string): string {
    name = this.resolve_colormap_name(name);
    return this.color_maps[name]["null_color"];
  },

  // Return the out of domain color value for the given color map.
  get_outofdomain_color: function (name: string): string {
    name = this.resolve_colormap_name(name);
    return this.color_maps[name]["outofdomain_color"];
  },

  // Return the scatterplot grid color value for the given color map.
  get_plot_grid_color: function (name: string): string {
    name = this.resolve_colormap_name(name);
    const scatterplot_grid_color = this.color_maps[name]?.scatterplot_grid_color ?? "black";
    return scatterplot_grid_color;
  },

  // Return the histogram bar color value for the given color map.
  get_histogram_bar_color: function (name: string): string {
    name = this.resolve_colormap_name(name);
    const histogram_bar_color = this.color_maps[name]?.histogram_bar_color ?? "black";
    return histogram_bar_color;
  },

  // Return the suggested opacity value for the given color map.
  get_opacity: function (name: string): string {
    name = this.resolve_colormap_name(name);
    return this.color_maps[name].opacity;
  },

  // Return a d3 linear color scale with the current color map for the domain [0, 1].
  // Callers should modify the domain by passing a min and max to suit their own needs.
  get_color_scale: function (name: string, min: number, max: number) {
    name = this.resolve_colormap_name(name);
    if (min === undefined) min = 0.0;
    if (max === undefined) max = 1.0;
    if (this.is_discrete(name)) {
      return this.get_color_scale_quantize(name, min, max);
    }
    var domain = [];
    var domain_scale = d3.scale
      .linear()
      .domain([0, this.color_maps[name].colors.length - 1])
      .range([min, max]);
    for (var i in this.color_maps[name].colors) domain.push(domain_scale(i));
    return d3.scale.linear().domain(domain).range(this.color_maps[name].colors);
  },

  // Return a d3 version 7 linear color scale with the current color map for the domain [0, 1].
  // Callers should modify the domain by passing a min and max to suit their own needs.
  get_color_scale_d3v7: function (name: string, min: number, max: number) {
    name = this.resolve_colormap_name(name);
    if (min === undefined) min = 0.0;
    if (max === undefined) max = 1.0;
    if (this.is_discrete(name)) {
      return this.get_color_scale_quantize_d3v7(name, min, max);
    }
    var domain = [];
    var domain_scale = d3v7
      .scaleLinear()
      .domain([0, this.color_maps[name].colors.length - 1])
      .range([min, max]);
    for (var i in this.color_maps[name].colors) domain.push(domain_scale(i));
    return d3v7.scaleLinear().domain(domain).range(this.color_maps[name].colors);
  },

  // Deprecated
  get_color_map: function (name: string, min: number, max: number) {
    return this.get_color_scale(name, min, max);
  },

  // Return a d3 quantize color scale that bins [min, max] across discrete palette colors.
  // When min === max (e.g. filtered to one numeric value), d3.scale.quantize is unreliable
  // (undefined in v3; wrong bin in v7), so fall back to a constant first-palette color.
  get_color_scale_quantize: function (name: string, min: number, max: number) {
    name = this.resolve_colormap_name(name);
    if (min === undefined) min = 0.0;
    if (max === undefined) max = 1.0;
    const colors = this.color_maps[name].colors;
    if (min === max) {
      return d3.scale.ordinal().domain([min]).range([colors[0]]);
    }
    return d3.scale.quantize().domain([min, max]).range(colors);
  },

  // Return a d3v7 quantize color scale that bins [min, max] across discrete palette colors.
  // See get_color_scale_quantize for the min === max fallback rationale.
  get_color_scale_quantize_d3v7: function (name: string, min: number, max: number) {
    name = this.resolve_colormap_name(name);
    if (min === undefined) min = 0.0;
    if (max === undefined) max = 1.0;
    const colors = this.color_maps[name].colors;
    if (min === max) {
      return d3v7.scaleOrdinal<number | string, d3.RGBColor>().domain([min]).range([colors[0]]);
    }
    return d3v7.scaleQuantize<d3.RGBColor>().domain([min, max]).range(colors);
  },

  // Discrete-aware numeric color scale: quantize for discrete maps, otherwise linear.
  get_color_scale_for_numeric: function (name: string, min: number, max: number) {
    return this.get_color_scale(name, min, max);
  },

  // Return a d3 log color scale with the current color map for the domain [0, 1].
  // Callers should modify the domain by passing a min and max to suit their own needs.
  // Discrete maps use equal-width quantize bins on [min, max] (log does not change binning).
  get_color_scale_log: function (colormap: string, min: number, max: number) {
    colormap = this.resolve_colormap_name(colormap);
    const rangeMin = min === undefined ? 0.0 : min;
    const rangeMax = max === undefined ? 1.0 : max;

    if (this.is_discrete(colormap)) {
      return this.get_color_scale_quantize(colormap, rangeMin, rangeMax);
    }

    let domain = [];
    let domain_scale = d3.scale
      .log()
      .domain([rangeMin, rangeMax])
      .range([1, this.color_maps[colormap].colors.length]);
    for (const index of this.color_maps[colormap].colors.keys()) {
      domain.push(domain_scale.invert(index + 1));
    }

    // Replace first and last values with rangeMin and rangeMax
    // because rounding errors in .invert() sometimes cause the first and last values to be out of range.
    domain[0] = rangeMin;
    domain[domain.length - 1] = rangeMax;

    return d3.scale.log().domain(domain).range(this.color_maps[colormap].colors);
  },

  // Return a d3 ordinal color scale with the current color map for the domain [0, 1].
  // Callers should modify the domain by passing an array of values to suit their own needs.
  get_color_scale_ordinal: function (name: string, values: (number | string)[]) {
    name = this.resolve_colormap_name(name);
    if (values === undefined) values = [0, 1];

    if (this.is_discrete(name)) {
      const colors = this.color_maps[name].colors;
      const rgbRange = values.map((_, i) => colors[i % colors.length]);
      return d3.scale.ordinal().domain(values).range(rgbRange);
    }

    var tempOrdinal = d3.scale.ordinal().domain(values).rangePoints([0, 100], 0);
    var tempColorscale = this.get_color_scale(name, 0, 100);
    var rgbRange = [];
    for (var i = 0; i < values.length; i++) {
      rgbRange.push(tempColorscale(tempOrdinal(values[i])));
    }
    return d3.scale.ordinal().domain(values).range(rgbRange);
  },

  // Return a d3 time scale with the current color map for the domain [0, 1].
  // Callers should modify the domain by passing a min and max to suit their own needs.
  // Discrete maps use equal-width quantize bins on [min, max].
  get_color_scale_time: function (name: string, min: number, max: number) {
    name = this.resolve_colormap_name(name);
    if (min === undefined) min = 0.0;
    if (max === undefined) max = 1.0;
    if (this.is_discrete(name)) {
      return this.get_color_scale_quantize(name, min, max);
    }
    var domain = [];
    var domain_scale = d3.scale
      .linear()
      .domain([0, this.color_maps[name].colors.length - 1])
      .range([min, max]);
    for (var i in this.color_maps[name].colors) domain.push(domain_scale(i));
    return d3.time.scale().domain(domain).range(this.color_maps[name].colors);
  },

  // Deprecated
  get_color_map_ordinal: function (name: string, values: (number | string)[]) {
    return this.get_color_scale_ordinal(name, values);
  },

  get_gradient_data: function (name: string) {
    var self = this;

    name = this.resolve_colormap_name(name);

    var colors = self.color_maps[name]["colors"];
    var length = colors.length;
    var data = [];

    if (self.is_discrete(name)) {
      // Hard-edged equal bands for discrete palettes (reversed for top→bottom legend).
      for (var i = 0; i < length; i++) {
        const color = colors[length - 1 - i];
        const start = (i / length) * 100;
        const end = ((i + 1) / length) * 100;
        data.push({ offset: start, color: color });
        data.push({ offset: end, color: color });
      }
      return data;
    }

    for (var i = 0; i < length; i++) {
      data.push({ offset: i * (100 / (length - 1)), color: colors[length - 1 - i] });
    }
    return data;
  },

  // Hard-edged legend stops aligned to unique category order for discrete maps.
  // For continuous maps, falls back to get_gradient_data.
  get_ordinal_legend_gradient: function (name: string, values: (number | string)[]) {
    name = this.resolve_colormap_name(name);
    if (!this.is_discrete(name) || !values || values.length === 0) {
      return this.get_gradient_data(name);
    }

    const colorscale = this.get_color_scale_ordinal(name, values);
    const length = values.length;
    const data = [];
    for (var i = 0; i < length; i++) {
      // Reverse so top of legend matches first category when axis is reversed.
      const value = values[length - 1 - i];
      const color = colorscale(value);
      const start = (i / length) * 100;
      const end = ((i + 1) / length) * 100;
      data.push({ offset: start, color: color });
      data.push({ offset: end, color: color });
    }
    return data;
  },

  setUpColorMapsForAllColumns: function (
    name: string,
    columns: { columnMin: number; columnMax: number; colorMap: string }[],
  ) {
    for (var j = 0; j != columns.length; ++j) {
      columns[j].colorMap = this.get_color_scale(name, columns[j].columnMin, columns[j].columnMax);
    }
  },
};
