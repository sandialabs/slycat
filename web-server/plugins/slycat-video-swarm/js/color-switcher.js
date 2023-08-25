/*
Copyright 2013 National Technology & Engineering Solutions of Sandia, LLC (NTESS). 
Under the terms of Contract DE-NA0003525 with NTESS, the U.S. Government 
retains certain rights in this software.
*/

import d3 from "d3";
import "jquery-ui";

$.widget("slycat.colorswitcher",
{
  options:
  {
    colormap : "day",
  },

  _create: function()
  {
    var self = this;

    this.color_maps =
    {
      "night":
      {
        "label": "Night",
        "background":   d3.rgb(128, 128, 128),
        "background_2": d3.rgb(143,143,146),
        "foreground":   d3.rgb(255, 255, 255),
        "null_color": "rgb(75,75,75)",
        "opacity": "0.5",
        "colors":
        [
          d3.rgb( 59,  76, 192),
          d3.rgb( 68,  90, 204),
          d3.rgb( 77, 104, 215),
          d3.rgb( 87, 117, 225),
          d3.rgb( 98, 130, 234),
          d3.rgb(108, 142, 241),
          d3.rgb(119, 154, 247),
          d3.rgb(130, 165, 251),
          d3.rgb(141, 176, 254),
          d3.rgb(152, 185, 255),
          d3.rgb(163, 194, 255),
          d3.rgb(174, 201, 253),
          d3.rgb(184, 208, 249),
          d3.rgb(194, 213, 244),
          d3.rgb(204, 217, 238),
          d3.rgb(213, 219, 230),
          d3.rgb(221, 221, 221),
          d3.rgb(229, 216, 209),
          d3.rgb(236, 211, 197),
          d3.rgb(241, 204, 185),
          d3.rgb(245, 196, 173),
          d3.rgb(247, 187, 160),
          d3.rgb(247, 177, 148),
          d3.rgb(247, 166, 135),
          d3.rgb(244, 154, 123),
          d3.rgb(241, 141, 111),
          d3.rgb(236, 127,  99),
          d3.rgb(229, 112,  88),
          d3.rgb(222,  96,  77),
          d3.rgb(213,  80,  66),
          d3.rgb(203,  62,  56),
          d3.rgb(192,  40,  47),
          d3.rgb(180,   4,  38),
        ]
      },
    "day":
      {
        "label": "Day",
        "background": d3.rgb(255, 255, 255),
        "background_2": d3.rgb(227,227,227),
        "foreground": d3.rgb(0, 0, 0),
        "null_color": "gray",
        "opacity": "0.7",
        "colors":
        [
          d3.rgb(100, 108, 234),
          d3.rgb(115, 118, 240),
          d3.rgb(128, 128, 244),
          d3.rgb(140, 138, 248),
          d3.rgb(151, 147, 250),
          d3.rgb(161, 155, 251),
          d3.rgb(169, 163, 251),
          d3.rgb(177, 170, 250),
          d3.rgb(184, 177, 248),
          d3.rgb(189, 182, 245),
          d3.rgb(193, 187, 241),
          d3.rgb(197, 191, 236),
          d3.rgb(199, 194, 230),
          d3.rgb(200, 196, 224),
          d3.rgb(201, 198, 216),
          d3.rgb(200, 199, 208),
          d3.rgb(198, 198, 198),
          d3.rgb(210, 197, 195),
          d3.rgb(220, 194, 192),
          d3.rgb(229, 191, 187),
          d3.rgb(236, 186, 181),
          d3.rgb(243, 181, 175),
          d3.rgb(248, 175, 168),
          d3.rgb(251, 168, 160),
          d3.rgb(254, 159, 152),
          d3.rgb(255, 150, 143),
          d3.rgb(255, 140, 133),
          d3.rgb(253, 129, 123),
          d3.rgb(250, 117, 112),
          d3.rgb(246, 105, 101),
          d3.rgb(240,  91,  90),
          d3.rgb(233,  75,  78),
          d3.rgb(225,  57,  66),
        ]
      },
    "rainbow":
      {
        "label": "Rainbow Night",
        "background": d3.rgb(128, 128, 128),
        "background_2": d3.rgb(143,143,146),
        "foreground": d3.rgb(255, 255, 255),
        "null_color": "rgb(75,75,75)",
        "opacity": "0.6",
        "colors":
        [
          d3.rgb(0, 0, 255),
          d3.rgb(0, 255, 0),
          d3.rgb(0, 255, 255),
          d3.rgb(255, 255, 0),
          d3.rgb(255, 0, 0),
        ]
      },
    "rainbow_day":
      {
        "label": "Rainbow Day",
        "background": d3.rgb(255, 255, 255),
        "background_2": d3.rgb(227,227,227),
        "foreground": d3.rgb(0, 0, 0),
        "null_color": "gray",
        "opacity": "0.7",
        "colors":
        [
          d3.rgb(0, 0, 255),
          d3.rgb(0, 255, 0),
          d3.rgb(0, 255, 255),
          d3.rgb(255, 255, 0),
          d3.rgb(255, 0, 0),
        ]
      },
    };

    this.button = $('<button class="btn dropdown-toggle btn-sm btn-outline-dark" type="button" id="colors-dropdown" data-toggle="dropdown" aria-expanded="false" title="Scatterplot Color Theme"> \
          Colors \
        </button>')
      .appendTo(this.element)
      ;
    this.list = $('<div class="dropdown-menu" aria-labelledby="colors-dropdown">')
      .appendTo(this.element)
      ;
    $.each(this.color_maps, function(key, value)
    {
      var gradient_data = self.get_gradient_data(key);
      var color_stops = [];
      for(var i = 0; i < gradient_data.length; i++)
      {
        color_stops.push( gradient_data[i].color + " " + gradient_data[i].offset + "%" );
      }
      var background_color = self.get_background(key);
      var item = $('<a class="dropdown-item">')
        .addClass("color")
        .toggleClass("active", key == self.options.colormap)
        .attr("data-colormap", key)
        .appendTo(self.list)
        .html(value.label)
        .click(function()
        {
          var menu_item = $(this);
          if(menu_item.hasClass("active"))
            return false;

          self.options.colormap = menu_item.attr("data-colormap");
          self.list.find(".color").removeClass("active");
          menu_item.addClass("active");

          self.element.trigger("colormap-changed", [self.options.colormap]);
        })
        .css({
          "background-image" : "linear-gradient(to bottom, " + color_stops.join(", ") + "), linear-gradient(to bottom, " + background_color + ", " + background_color + ")",
          "background-size" : "5px 75%, 50px 100%",
          "background-position" : "right 10px center, right 5px center",
          "background-repeat" : "no-repeat, no-repeat",
          "padding-right" : "70px",
        })
        ;
    });

  },

  _setOption: function(key, value)
  {
    this.options[key] = value;

    if(key == "colormap")
    {
      this.list.find(".color").removeClass("active");
      this.list.find("[data-colormap='" + this.options.colormap + "']").addClass("active");
    }
  },

  // Return a d3 rgb object with the suggested background color for the given color map.
  get_background: function(name)
  {
    if(name === undefined)
      name = this.options.colormap;
    return this.color_maps[name].background;
  },

  // Return a d3 rgb object with the suggested background_2 color for the given color map.
  get_background_2: function(name)
  {
    if(name === undefined)
      name = this.options.colormap;
    return this.color_maps[name].background_2;
  },

  // Return a d3 rgb object with the suggested foreground color for the given color map.
  get_foreground: function(name)
  {
    if(name === undefined)
      name = this.options.colormap;
    return this.color_maps[name].foreground;
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
    // The color scale domain will need to be set dynamically at some point. This is just a quick fix for the paper.
    if(name === undefined)
      name = this.options.colormap;
    if(min === undefined)
      min = -500.0;
    if(max === undefined)
      max = -144.0;
    var domain = []
    var domain_scale = d3.scale.linear()
      .domain([0, this.color_maps[name].colors.length-1])
      .range([min, max]);
    for(var i in this.color_maps[name].colors)
      domain.push(domain_scale(i));

    var myScale = d3.scale.linear().domain(domain).range(this.color_maps[name].colors);
    return myScale;
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

