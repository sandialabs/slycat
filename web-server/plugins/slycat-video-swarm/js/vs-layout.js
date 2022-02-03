/*
Copyright 2013 National Technology & Engineering Solutions of Sandia, LLC (NTESS). 
Under the terms of Contract DE-NA0003525 with NTESS, the U.S. Government 
retains certain rights in this software.
*/
// This function sets up the jquery layout for the movie-plex function.
// It uses the variable SCATTER_BUTTONS_HEIGHT as passed from vs-ui.js.

// S. Martin
// 4/27/2015

import metadata_table from "./vs-table.js";

import "jquery-ui";
// disable-selection and draggable required for jquery.layout resizing functionality
import "jquery-ui/ui/disable-selection";
import "jquery-ui/ui/widgets/draggable";
import "layout-jquery3";

import scatter_plot from "./vs-scatter-plot.js";

export default {
   
  setup: function()
    {
    
    // ***************************************************
    // SETUP LAYOUT: set up the sliding bars from uiLayout 
    // ***************************************************
    
      // setup the default window layout using jQuery uilayout
      $("#mp-model").height($(window).height());

    // set up the outer layout (includes center and east)
    // movies are east, center is everything else
      $("#mp-model").layout(
      {
          applyDefaultStyles: true,
          north :
          {
            size: 39,
            resizeWhileDragging : false,
            resizable: false,
          },
          east:
          {
            size: $(window).width() / 5,
            resizeWhileDragging : true,
          },
      }); 
    
    // setup inner window layout
    // south is meta-data table (defaults to closed)
    $("#mp-model > .ui-layout-center").layout(
    {
      applyDefaultStyles: true,
      south:
      {
        size: $(window).height() / 8,
        resizeWhileDragging: false,
        // initClosed: true,
        onresize_end: function()
        {
          if($("#mp-datapoints-table").data("vs-table")) {
            $("#mp-datapoints-table").css("height", $("#mp-datapoints-pane").height());
            $("#mp-datapoints-table").table("resize_canvas");
          }
        },
      },
    });

    // set up inner window with scatter plot & buttons
    // (south is trajectories window)
    $("#mp-model > .ui-layout-center > .ui-layout-center").layout(
    {
      applyDefaultStyles: true,
      onresize_end: function()
      {
        if($("#mp-mds-scatterplot").data("mp-scatterplot")) {
          $("#mp-mds-scatterplot").scatterplot("draw");
        }
      },
      south:
      {
          size: $(window).height() / 4,
          onresize_end: function()
          {
            if($("#waveform-viewer").data("mp-trajectories")) {
              $("#waveform-viewer").trajectories("resize_canvas");
            }
          },
      },
    });
  
      // when resizing the window, adjust the height of the layout.
      $(window).resize(function()
      {
          $("#mp-model").height($(window).height());
      });
  
  }
  
};