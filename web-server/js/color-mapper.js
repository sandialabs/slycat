/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

function color_mapper() {

  var selectedColorMapName = "nightcolormap";
  // Definition of our color maps
  var colorMaps = {
    // This is meant to be used against a black background
    "nightcolormap": {
      "uiName": "Night",
      "scalar": [0.0, 0.03125, 0.0625, 0.09375, 0.125, 0.15625, 0.1875, 0.21875, 0.25, 0.28125, 0.3125, 0.34375, 0.375, 0.40625, 0.4375, 0.46875, 0.5, 0.53125, 0.5625, 0.59375, 0.625, 0.65625, 0.6875, 0.71875, 0.75, 0.78125, 0.8125, 0.84375, 0.875, 0.90625, 0.9375, 0.96875, 1.0,],
      "RGBs"  : [
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
                ],
      "className": "nightMode",
    },
    // This is used against a white background
    "daycolormap": {
      "uiName": "Day",
      "scalar": [0,0.03125,0.0625,0.09375,0.125,0.15625,0.1875,0.21875,0.25,0.28125,0.3125,0.34375,0.375,0.40625,0.4375,0.46875,0.5,0.53125,0.5625,0.59375,0.625,0.65625,0.6875,0.71875,0.75,0.78125,0.8125,0.84375,0.875,0.90625,0.9375,0.96875,1,],
      "RGBs"  : [
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
                ],
      "className": "dayMode",
    },
  }

this.setUpColorMapsForAllColumns = function(colorMapName, columns) {
  for(var j = 0; j != columns.length; ++j) {
    columns[j].colorMap = createColorMap( columns[j].columnMin, columns[j].columnMax, colorMaps[colorMapName].scalar, colorMaps[colorMapName].RGBs );
  }
}

// Return a d3 linear color scale with the current color map for the domain [0, 1].
// Callers should modify the domain to suit their own needs.  Note that a color
// map may be polylinear, i.e. require more than two values for the domain.
this.get_current_color_map = function()
{
  var color_map = d3.scale.linear().domain(colorMaps[selectedColorMapName].scalar).range(colorMaps[selectedColorMapName].RGBs);
  return color_map;
}

this.createSelectedColorMap = function(min, max) {
  return createColorMap(min, max, colorMaps[selectedColorMapName].scalar, colorMaps[selectedColorMapName].RGBs);
}

function createColorMap(min, max, scalar, rgb) {
  var range = max - min;
  var domain = [];
  for(i=0; i < scalar.length; i++) {
    domain.push( (range * scalar[i]) + min );
  }
  var colorMap = d3.scale.linear().domain( domain ).range( rgb );
  return colorMap;
}

this.getClassName = function(color_map_name) {
  return colorMaps[color_map_name].className;
}

this.getAllClassNames = function() {
  var allClassNames = '';
  $.each(colorMaps, function(k,v){
    allClassNames += (v.className + ' ');
  });
  return allClassNames;
}

this.addSwitcher = function(container, bookmark, callback) {
  // No need to switch if there's only a single color map
  if(Object.keys(colorMaps).length > 1) {

    var colorSwitcher = $('<div id="color-switcher">').appendTo(container)
      .append('<span class="label">Colors: </span>')
      ;
    var colors = $.each(colorMaps, function(k, v) {
        $('<span class="color" data-colormap="' + k + '">' + v.uiName + '</span>').appendTo(colorSwitcher);
      }
    );

    // Set selected color scale according to what's in the bookmark
    var colors = colorSwitcher.find(".color");
    var selected;
    if( bookmark["colormap"] != null) {
      selected = colors.filter("[data-colormap='" + bookmark["colormap"] + "']");
      selectedColorMapName = bookmark["colormap"];
    } else {
      selected = colors.first();
    }
    selected.addClass("selected");

    // Setting up color scale switcher interaction
    colors.click(function(){
      // Do nothing if click was on already selected item
      if(!$(this).hasClass("selected")) {
        selectedColorMapName = this.getAttribute("data-colormap");
        colors.removeClass("selected");
        $(this).addClass("selected");
        if(callback) {
          callback(this.getAttribute("data-colormap"));
        }
      }
    });

  }
}


}
