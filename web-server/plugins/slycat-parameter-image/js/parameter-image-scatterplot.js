/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

//////////////////////////////////////////////////////////////////////////////////
// d3js.org scatterplot visualization, for use with the parameter-image model.

import api_root from "js/slycat-api-root";
import d3 from "d3";
import URI from "urijs";
import * as remotes from "js/slycat-remotes";
import _ from "lodash";
import ko from "knockout";
import "jquery-ui";
import "js/slycat-login-controls";
import { load as geometryLoad, } from "./vtk-geometry-viewer";
import { 
  changeCurrentFrame,
  setOpenMedia,
  setMediaSizePosition,
} from './actions';
import { get_variable_label } from './ui';
import { isValueInColorscaleRange } from './color-switcher';
import $ from 'jquery';
import React from 'react';
import ReactDOM from "react-dom";
import { Provider, connect } from 'react-redux';
import MediaLegends from './Components/MediaLegends'; 
import { v4 as uuidv4 } from 'uuid';

var nodrag = d3.behavior.drag();

// Commenting this out Nov 20 1017 because I have no idea what it does and I rewrote much of the dragging code. If still no problems after a few months, just delete it.
nodrag.on("dragstart", function() {
  // console.log("nodrag.on('dragstart'...");
  // d3.event.sourceEvent.stopPropagation();
});

// Events for vtk viewer
var vtkselect_event = new Event('vtkselect');
var vtkunselect_event = new Event('vtkunselect');
var vtkresize_event = new Event('vtkresize');
var vtkclose_event = new Event('vtkclose');

$.widget("parameter_image.scatterplot",
{
  options:
  {
    model : null,
    width : 300,
    height : 300,
    pick_distance : 3,
    drag_threshold : 3,
    indices : [],
    x_label : "X Label",
    y_label : "Y Label",
    v_label : "V Label",
    x : [],
    y : [],
    v : [],
    x_string : false,
    y_string : false,
    v_string : false,
    x_index : null,
    y_index : null,
    v_index : null,
    images : [],
    selection : [],
    colorscale : d3.scale.linear().domain([-1, 0, 1]).range(["blue", "white", "red"]),
    border : 25,
    open_images : [],
    gradient : null,
    hidden_simulations : [],
    filtered_indices : [],
    filtered_selection : [],
    filtered_x : [],
    filtered_y : [],
    filtered_v : [],
    scale_x : [],
    scale_y : [],
    scale_v: [],
    "auto-scale" : true,
    canvas_square_size : 8,
    canvas_square_border_size : 1,
    canvas_selected_square_size : 16,
    canvas_selected_square_border_size : 2,
    pinned_width : 200,
    pinned_height : 200,
    hover_time : 250,
    image_cache : {},
    video_file_extensions : [
      '3gp','3g2','h261','h263','h264','jpgv','jpm','jpgm','mj2','mjp2','mp4','mp4v','mpg4','mpeg','mpg','mpe','m1v','m2v','ogv','qt','mov','uvh','uvvh','uvm','uvvm','uvp','uvvp',
      'uvs','uvvs','uvv','uvvv','dvb','fvt','mxu','m4u','pyv','uvu','uvvu','viv','webm','f4v','fli','flv','m4v','mkv','mk3d','mks','mng','asf','asx','vob','wm','wmv','wmx','wvx','avi',
      'movie','smv','ice',
    ],
    link_protocols : ['http','https'],
    "video-sync" : false,
    "video-sync-time" : 0,
    frameLength : 1/25,
    threeD_sync : false,
    highest_z_index: 0,
    axes_font_size: 12,
    axes_font_family: "Arial",
    axes_variables_scale: {},
    x_axis_type: 'Linear',
    y_axis_type: 'Linear',
    v_axis_type: 'Linear',
  },

  syncing_videos : [],
  pausing_videos : [],
  playing_videos : [],
  current_frame : null,
  previousState : null,
  custom_axes_ranges : {
    x: {
      min: undefined,
      max: undefined
    },
    y: {
      min: undefined,
      max: undefined
    },
    v: {
      min: undefined,
      max: undefined
    }
  },

  _create: function()
  {
    var self = this;

    if(self.options["auto-scale"])
    {
      self.options.filtered_x = self._filterValues(self.options.x);
      self.options.filtered_y = self._filterValues(self.options.y);
      self.options.filtered_v = self._filterValues(self.options.v);
      self.options.scale_x = self.options.filtered_x;
      self.options.scale_y = self.options.filtered_y;
      self.options.scale_v = self.options.filtered_v;
    }
    else
    {
      self.options.scale_x = self.options.x;
      self.options.scale_y = self.options.y;
      self.options.scale_v = self.options.v;
    }
    
    this.remotes = remotes.create_pool();
    self.hover_timer = null;
    self.close_hover_timer = null;

    self.hover_timer_canvas = null;

    self.opening_image = null;
    self.state = "";
    self.start_drag = null;
    self.current_drag = null;
    self.end_drag = null;
    self.login_open = false;

    self.set_x_y_v_axes_types();
    self.set_custom_axes_ranges();

    // Setup the scatterplot ...
    self.media_layer = d3.select(self.element.get(0)).append("div").attr("class", "media-layer bootstrap-styles");
    
    // Stop propagation of mousedown event on all elements inside .media-layer
    // to prevent "highlighting" points while dragging pins while moving or resizing them.
    $('.media-layer').delegate('*', 'mousedown', function(event){
      // console.log("media-layer's mousedown delegation handler function");
      // Stopping proagation to prevent dragging of pins from selecting points.
      event.stopPropagation();
      // Preventing default browser action on mousedown because that causes the browser to "select" text and other elements by highlighting them.
      event.preventDefault();
    });

    self.svg = d3.select(self.element.get(0)).append("svg")
      .style({
        "opacity": ".99",
        // "position": "absolute", // Setting position to absolute also brings the svg element in front of .media-layer but keeps .image-frames on top of everything
      })
      .attr("class", "scatterplot-svg")
      ;
    self.x_axis_layer = self.svg.append("g").attr("class", "x-axis");
    self.y_axis_layer = self.svg.append("g").attr("class", "y-axis");
    self.legend_layer = self.svg.append("g").attr("class", "legend");
    self.legend_axis_layer = self.legend_layer.append("g").attr("class", "legend-axis");
    self.canvas_datum = d3.select(self.element.get(0)).append("canvas")
      .style({'position':'absolute'})
      .attr("class", "points")
      .node()
      ;
    self.canvas_datum_layer = self.canvas_datum.getContext("2d");
    self.canvas_selected = d3.select(self.element.get(0)).append("canvas")
      .style({'position':'absolute'})
      .attr("class", "points")
      .node()
      ;
    self.canvas_selected_layer = self.canvas_selected.getContext("2d");
    self.selection_layer = self.svg.append("g").attr("class", "selection-layer");
    self.line_layer = self.svg.append("g").attr("class", "line-layer");
    self.threeD_legends_layer = self.svg.append("g").attr("id", "threeD_legends");

    self.options.image_cache = {};

    self.updates = {};
    self.update_timer = null;
    self._schedule_update({
      update_indices:true,
      update_width:true,
      update_height:true,
      update_x:true,
      update_y:true,
      update_x_label:true,
      update_y_label:true,
      render_data:true,
      render_selection:true,
      open_images:true,
      render_legend:true,
      update_legend_colors:true,
      update_legend_position:true,
      update_legend_axis:true,
      update_v_label:true,
    });

    let setup_legend_drag = (legend) => {
      legend.call(
        d3.behavior.drag()
          .on('drag', function(){
            // Make sure mouse is inside svg element
            if( 0 <= d3.event.y && d3.event.y <= self.options.height && 0 <= d3.event.x && d3.event.x <= self.options.width ){
              var theElement = d3.select(this);
              var transx = Number(theElement.attr("data-transx"));
              var transy = Number(theElement.attr("data-transy"));
              transx += d3.event.dx;
              transy += d3.event.dy;
              theElement.attr("data-transx", transx);
              theElement.attr("data-transy", transy);
              theElement.attr('transform', "translate(" + transx + ", " + transy + ")");
            }
          })
          .on("dragstart", function() {
            self.state = "moving";
            d3.event.sourceEvent.stopPropagation(); // silence other listeners
          })
          .on("dragend", function() {
            self.state = "";
            // self._sync_open_media();
            d3.select(this).attr("data-status", "moved");
          })
      );
    }

    setup_legend_drag(self.legend_layer);

    // self.element is div#scatterplot here
    self.element.mousedown(function(e)
    {
      // console.log("self.element.mousedown");
      e.preventDefault();
      let output = e;
      self.start_drag = [self._offsetX(e), self._offsetY(e)];
      let s_d = self.start_drag;
      self.end_drag = null;
      let s_e = self.start_drag;
    });

    self.element.mousemove(function(e)
    {
      if(self.start_drag === null)
      {
        // Only schedule a hover if user is hovering over svg, not over images, video, etc.
        // and we have images to open
        if(e.target.nodeName === "svg" && self.options.images.length > 0)
        {
          self._schedule_hover_canvas(e);
        }
      }
      else if(self.start_drag) // Mouse is down ...
      {
        if(self.end_drag) // Already dragging ...
        {
          self.end_drag = [self._offsetX(e), self._offsetY(e)];
          let output = e;
          var width = self.element.width();
          var height = self.element.height();

          self.selection_layer.selectAll(".rubberband")
              .attr("x", Math.min(self.start_drag[0], self.end_drag[0]))
              .attr("y", Math.min(self.start_drag[1], self.end_drag[1]))
              .attr("width", Math.abs(self.start_drag[0] - self.end_drag[0]))
              .attr("height", Math.abs(self.start_drag[1] - self.end_drag[1]))
            ;
        }
        else
        {
          if(Math.abs(self._offsetX(e) - self.start_drag[0]) > self.options.drag_threshold || Math.abs(self._offsetY(e) - self.start_drag[1]) > self.options.drag_threshold) // Start dragging ...
          {
            self.state = "rubber-band-drag";
            self.end_drag = [self._offsetX(e), self._offsetY(e)];
            self.selection_layer.append("rect")
              .attr("class", "rubberband")
              .attr("x", Math.min(self.start_drag[0], self.end_drag[0]))
              .attr("y", Math.min(self.start_drag[1], self.end_drag[1]))
              .attr("width", Math.abs(self.start_drag[0] - self.end_drag[0]))
              .attr("height", Math.abs(self.start_drag[1] - self.end_drag[1]))
              .attr("fill", "rgba(255, 255, 0, 0.3)")
              .attr("stroke", "rgb(255, 255, 0)")
              .attr("linewidth", 2)
              ;
          }
        }
      }
    });

    self.element.mouseout(function(e){
      self._cancel_hover_canvas();
    });

    self.element.mouseup(function(e)
    {
      // Figure out of this event happened on the scatterplot svg element
      const target = e.target;
      const isScatterplotSVG = target.tagName.toLowerCase() == 'svg' && target.classList.contains('scatterplot-svg');
      const isRubberbandRect = target.tagName.toLowerCase() == 'rect' && target.classList.contains('rubberband');
      // console.group(`mouseup %o`, e);
      // console.debug(`isScatterplotSVG: %o`, isScatterplotSVG);
      // console.groupEnd();

      // Don't respond if we are resizing or moving the frame or if the mouse up
      // did not happen on the scatterplot svg element and also not on the rubberband rectangle.
      if(self.state == "resizing" || self.state == "moving" || (!isScatterplotSVG && !isRubberbandRect))
      {
        // console.debug(`Ignoring mouseup. isScatterplotSVG: %o, isRubberbandRect: %o`, isScatterplotSVG, isRubberbandRect);
        return;
      }

      if(!e.ctrlKey && !e.metaKey)
      {
        self.options.selection = [];
        self.options.filtered_selection = [];
      }

      var x = self.options.x;
      var y = self.options.y;
      var count = x.length;
      var x_coord, y_coord;

      if(self.state == "rubber-band-drag") // Rubber-band selection ...
      {
        self.selection_layer.selectAll(".rubberband").remove();

        if(self.start_drag && self.end_drag) {
          var x1 = Math.min(self.start_drag[0], self.end_drag[0]);
          var x2 = Math.max(self.start_drag[0], self.end_drag[0]);
          var y1 = Math.min(self.start_drag[1], self.end_drag[1]);
          var y2 = Math.max(self.start_drag[1], self.end_drag[1]);

          for(var i = 0; i != count; ++i)
          {
            x_coord = self.x_scale_format(x[i]);
            y_coord = self.y_scale_format(y[i]);
            if(x1 <= x_coord && x_coord <= x2 && y1 <= y_coord && y_coord <= y2)
            {
              var index = self.options.selection.indexOf(self.options.indices[i]);
              if(index == -1)
                self.options.selection.push(self.options.indices[i]);
            }
          }
        }
      }
      else // Pick selection ...
      {
        var x1 = self._offsetX(e) - self.options.pick_distance;
        var x2 = self._offsetX(e) + self.options.pick_distance;
        var y1 = self._offsetY(e) - self.options.pick_distance;
        var y2 = self._offsetY(e) + self.options.pick_distance;

        for(var i = count - 1; i > -1; i--)
        {
          x_coord = self.x_scale_format(x[i]);
          y_coord = self.y_scale_format(y[i]);
          if(x1 <= x_coord && x_coord <= x2 && y1 <= y_coord && y_coord <= y2)
          {
            // Update the list of selected points ...
            var index = self.options.selection.indexOf(self.options.indices[i]);
            if(index == -1)
            {
              // Selecting a new point.
              self.options.selection.push(self.options.indices[i]);
            }
            else
            {
              // Deselecting an existing point.
              self.options.selection.splice(index, 1);
            }

            break;
          }
        }
      }

      self.start_drag = null;
      self.end_drag = null;
      self.state = "";

      self._filterIndices();
      self.options.selection = self.options.filtered_selection.slice(0);
      self._schedule_update({render_selection:true});
      self.element.trigger("selection-changed", [self.options.selection]);
    });
    self._filterIndices();

    const update_axes_font_size = () => {
      if(self.options.axes_font_size != store.getState().fontSize)
      {
        // console.log('1 update_axes_font_size');
        self.options.axes_font_size = store.getState().fontSize;
        self.x_axis_layer.selectAll("text")
          .style("font-size", self.options.axes_font_size + 'px')
          ;
        self.y_axis_layer.selectAll("text")
          .style("font-size", self.options.axes_font_size + 'px')
          ;
        self.legend_layer.selectAll("text")
          .style("font-size", self.options.axes_font_size + 'px')
          ;
        self._schedule_update({update_y_label:true});
        self._schedule_update({update_x_label:true});
      }
    };

    const update_axes_font_family = () => {
      if(self.options.axes_font_family != store.getState().fontFamily)
      {
        // console.log('2 update_axes_font_family');
        self.options.axes_font_family = store.getState().fontFamily;
        self.x_axis_layer.selectAll("text")
          .style("font-family", self.options.axes_font_family)
          ;
        self.y_axis_layer.selectAll("text")
          .style("font-family", self.options.axes_font_family)
          ;
        self.legend_layer.selectAll("text")
          .style("font-family", self.options.axes_font_family)
          ;
        self._schedule_update({update_y_label:true});
        self._schedule_update({update_x_label:true});
      }
    };

    const update_axes_variables_scale = () => {
      if(!_.isEqual(self.options.axes_variables_scale, store.getState().axesVariables))
      {
        // console.log('3 update_axes_variables_scale');
        self.options.axes_variables_scale = _.cloneDeep(store.getState().axesVariables);
        self.set_x_y_v_axes_types();
        self._schedule_update({
          update_x:true, 
          update_x_label:true, 
          update_y:true, 
          update_y_label:true, 
          update_leaders:true, 
          render_data:true, 
          render_selection:true, 
          update_legend_axis:true
        });
      }
    };

    const update_point_border_size = () => {
      let unselected_point_size_changed = self.options.canvas_square_size != store.getState().unselected_point_size;
      let unselected_border_size_changed = self.options.canvas_square_border_size != store.getState().unselected_border_size;
      let selected_point_size_changed = self.options.canvas_selected_square_size != store.getState().selected_point_size;
      let selected_border_size_changed = self.options.canvas_selected_square_border_size != store.getState().selected_border_size;
      
      if(unselected_point_size_changed || unselected_border_size_changed)
      {
        // console.log('4 update_point_border_size');
        self.options.canvas_square_size = store.getState().unselected_point_size;
        self.options.canvas_square_border_size = store.getState().unselected_border_size;
        
        self._schedule_update({
          update_datum_width_height: true, 
          render_data:true, 
        });
      }
      if(selected_point_size_changed || selected_border_size_changed)
      {
        // console.log('4 update_point_border_size');
        self.options.canvas_selected_square_size = store.getState().selected_point_size;
        self.options.canvas_selected_square_border_size = store.getState().selected_border_size;

        self._schedule_update({
          update_selection_width_height: true, 
          render_selection:true, 
        });
      }
    };

    const update_scatterplot_labels = () => {
      const x_label_changed = self.options.x_label != get_variable_label(self.options.x_index);
      const y_label_changed = self.options.y_label != get_variable_label(self.options.y_index);
      const v_label_changed = self.options.v_label != get_variable_label(self.options.v_index);
      // console.log('x_label_changed: ' + x_label_changed);
      
      if(x_label_changed)
      {
        // console.log('5 update_scatterplot_labels');
        self.options.x_label = get_variable_label(self.options.x_index);
        self._schedule_update({update_x_label:true});
      }
      if(y_label_changed)
      {
        // console.log('5 update_scatterplot_labels');
        self.options.y_label = get_variable_label(self.options.y_index);
        self._schedule_update({update_y_label:true});
      }
      if(v_label_changed)
      {
        // console.log('5 update_scatterplot_labels');
        self.options.v_label = get_variable_label(self.options.v_index);
        self._schedule_update({update_v_label:true});
      }
    }

    const update_media_sizes = () => {
      // console.group(`update_media_sizes`);
      // console.debug(`previous open_media is %o`, self.previousState.open_media);
      // console.debug(`new open_media is %o`, store.getState().open_media);
      // console.debug(`Are they the same? %o`, self.previousState.open_media == store.getState().open_media);
      // If open_media array changed, let's go through it and apply any updated sizes
      if(self.previousState.open_media != store.getState().open_media)
      {
        store.getState().open_media.forEach(function(currentMedia, index, array) {
          const frames = $(`.media-layer div.image-frame[data-uid=${currentMedia.uid}]`);
          let differentWidth, differentHeight;
          // console.debug(`Checking frames %o`, frames);
          frames.css('width', function(index, value){
            // console.debug(`current frame index is %o and frame is %o`, index, value);
            differentWidth = value != `${currentMedia.width}px`;
            if(differentWidth)
            {
              // console.debug(`We have a new width value of %o while current value is %o`, 
                // currentMedia.width, value);
              return currentMedia.width;
            }
            // console.debug(`We have same width value of %o while current value is %o`, 
              // currentMedia.width, value);
          });
          frames.css('height', function(index, value){
            // console.debug(`current frame index is %o and frame is %o`, index, value);
            differentHeight = value != `${currentMedia.height}px`;
            if(differentHeight)
            {
              // console.debug(`We have a new height value of %o while current value is %o`, 
                // currentMedia.height, value);
              return currentMedia.height;
            }
            // console.debug(`We have same height value of %o while current value is %o`, 
              // currentMedia.height, value);
          });
          frames.each(function(index, element) {
            // If we resized the frame...
            if(differentWidth || differentHeight)
            {
              // Adjust its leader line
              self._adjust_leader_line(d3.select(element));

              // Check each frame to see if it contains a VTP
              const vtp = element.querySelector(`.vtp`);
              // If it has a VTP and it was resized...
              if(vtp)
              {
                // Fire a custom reize event to let vtk viewers know it was resized
                // console.debug(`Dealing with VTP %o, so need to let it know to resize`, element.dataset.uri);
                vtp.dispatchEvent(vtkresize_event);
              }
            }
            
          });
        });
      }
      // console.groupEnd();
    }

    ReactDOM.render(
      <Provider store={window.store}>
        <MediaLegends />
      </Provider>,
      document.getElementById('threeD_legends')
    );

    const update_previous_state = () => {
      // console.log('LAST update_previous_state');
      self.previousState = window.store.getState();
    }

    update_previous_state();
    window.store.subscribe(update_axes_font_size);
    window.store.subscribe(update_axes_font_family);
    window.store.subscribe(update_axes_variables_scale);
    window.store.subscribe(update_point_border_size);
    window.store.subscribe(update_scatterplot_labels);
    window.store.subscribe(update_media_sizes);
    // This update_previous_state needs to be the last window.store.subscribe
    // since the other callbacks rely on the previous state not being updated
    // until they are finished.
    window.store.subscribe(update_previous_state);
  },

  update_axes_ranges: function()
  {
    // console.log('update_axes_scales');
    let self = this;
    // Make a copy of current custom axes ranges
    let previous_custom_axes_ranges = _.cloneDeep(self.custom_axes_ranges);
    self.set_custom_axes_ranges();
    for(const axis of ['x','y','v'])
    {
      if(!_.isEqual(previous_custom_axes_ranges[axis], self.custom_axes_ranges[axis]))
      {
        // console.log(`update_axes_scales updating ${axis}`);
        self._schedule_update({
          [`update_${axis}`]:true, 
          update_leaders:true, 
          render_data:true, 
          render_selection:true,
          update_legend_axis: axis == 'v' ? true : false,
        });
      }
    }
    self._close_hidden_simulations();
    self._open_shown_simulations();
    self._sync_open_media();
  },

  set_x_y_v_axes_types: function()
  {
    var self = this;
    self.options.x_axis_type = self.options.axes_variables_scale[self.options.x_index] != undefined ? self.options.axes_variables_scale[self.options.x_index] : 'Linear';
    self.options.y_axis_type = self.options.axes_variables_scale[self.options.y_index] != undefined ? self.options.axes_variables_scale[self.options.y_index] : 'Linear';
    self.options.v_axis_type = self.options.axes_variables_scale[self.options.v_index] != undefined ? self.options.axes_variables_scale[self.options.v_index] : 'Linear';
  },

  set_custom_axes_ranges: function()
  {
    var self = this;
    for(const axis of ['x','y','v'])
    {
      const variableRanges = window.store.getState().variableRanges[self.options[`${axis}_index`]];
      const customMin = variableRanges != undefined ? variableRanges.min : undefined;
      const customMax = variableRanges != undefined ? variableRanges.max : undefined;
      self.custom_axes_ranges[axis].min = customMin;
      self.custom_axes_ranges[axis].max = customMax;
    }
  },

  _filterIndices: function()
  {
    var self = this;
    var x = self.options.x;
    var y = self.options.y;
    var indices = self.options.indices;
    var selection = self.options.selection;
    var hidden_simulations = self.options.hidden_simulations;

    self.options.filtered_indices = _.difference(
      self._cloneArrayBuffer(indices).filter((element, index, array) => self._validateValue(x[index]) && self._validateValue(y[index]) ), 
      hidden_simulations
    );

    self.options.filtered_selection = _.difference(
      selection.filter((element, index, array) => self._validateValue(x[element]) && self._validateValue(y[element]) ), 
      hidden_simulations
    );
  },

  // Filters source values by removing hidden_simulations
  _filterValues: function(source)
  {
    var self = this;
    var hidden_simulations = self.options.hidden_simulations.sort(d3.ascending);
    var length = hidden_simulations.length;

    var filtered = self._cloneArrayBuffer(source);

    for(var i=length-1; i>=0; i--)
    {
      filtered.splice(hidden_simulations[i], 1);
    }

    return filtered;
  },

  // Clones an ArrayBuffer or Array
  _cloneArrayBuffer: function(source)
  {
    // Array.apply method of turning an ArrayBuffer into a normal array is very fast (around 5ms for 250K) but doesn't work in WebKit with arrays longer than about 125K
    // if(source.length > 1)
    // {
    //   return Array.apply( [], source );
    // }
    // else if(source.length == 1)
    // {
    //   return [source[0]];
    // }
    // return [];

    // For loop method is much shower (around 300ms for 250K) but works in WebKit. Might be able to speed things up by using ArrayBuffer.subarray() method to make smallery arrays and then Array.apply those.
    var clone = [];
    for(var i = 0; i < source.length; i++)
    {
      clone.push(source[i]);
    }
    return clone;
  },

  _createScale: function(string, values, range, reverse, type, axis)
  {
    let self = this;
    // console.log("_createScale: " + type);
    const customMin = self.custom_axes_ranges[axis].min;
    const customMax = self.custom_axes_ranges[axis].max;

    // Make a time scale for 'Date & Time' variable types
    if(type == 'Date & Time')
    {
      let dates = [];
      for(let date of values)
      {
        // Make sure Date is valid before adding it to array, so we get a scale with usable min and max
        date = new Date(date.toString())
        if(!isNaN(date))
        {
          dates.push(date);
        }
      }
      // console.log("unsorted dates: " + dates);
      dates.sort(function(a, b){
        return a - b;
      });
      // console.log('sorted dates: ' + dates);

      // Use custom range for min or max if we have one
      const min = customMin != undefined && !isNaN(new Date(customMin.toString())) ? new Date(customMin.toString()) : dates[0];
      const max = customMax != undefined && !isNaN(new Date(customMax.toString())) ? new Date(customMax.toString()) : dates[dates.length-1];

      let domain = [min, max];
      // console.log('domain: ' + domain);
      if(reverse === true)
      {
        domain.reverse();
      }
      return d3.time.scale()
        .domain(domain)
        .range(range)
        ;
    }
    // For numeric variables
    else if(!string)
    {
      // Use custom range for min or max if we have one
      const min = customMin != undefined ? customMin : d3.min(values);
      const max = customMax != undefined ? customMax : d3.max(values);

      let domain = [min, max];
      if(reverse === true)
      {
        domain.reverse();
      }
      // Log scale if 'Log' variable types
      if(type == 'Log')
      {
        return d3.scale.log()
          .domain(domain)
          .range(range)
          ;
      }
      // Linear scale otherwise
      return d3.scale.linear()
        .domain(domain)
        .range(range)
        ;
    }
    // For string variables, make an ordinal scale
    var uniqueValues = d3.set(values).values().sort();
    if(reverse === true)
    {
      uniqueValues.reverse();
    }
    return d3.scale.ordinal()
      .domain(uniqueValues)
      .rangePoints(range)
      ;
  },

  _getDefaultXPosition: function(imageIndex, imageWidth)
  {
    // We force the image to the left or right side of the screen, based on the target point position.
    var self = this;
    var width = self.svg.attr("width");
    var range = self.x_scale.range();
    var rangeLast = range.length - 1;
    var relx = (self.x_scale_format(self.options.x[imageIndex]) - range[0]) / (range[rangeLast] - range[0]);
    var x;

    if(relx < 0.5)
      x = relx * range[0];
    else
      x = width - ((width - range[rangeLast]) * (1.0 - relx)) - imageWidth;

    return parseInt(x);
  },

  _getDefaultYPosition: function(imageIndex, imageHeight)
  {
    var self = this;
    var height = self.svg.attr("height");
    var target_y = self.y_scale_format(self.options.y[imageIndex]);
    return parseInt((target_y / height) * (height - imageHeight));
  },

  _validateValue: function(value)
  {
    var self = this;
    if(typeof value == "number" && !isNaN(value))
      return true;
    if(typeof value == "string" && value.trim() !== "")
      return true;
    return false;
  },

  _setOption: function(key, value)
  {
    var self = this;

    // console.log("parameter_image.scatterplot._setOption()", key, value);
    self.options[key] = value;

    // This "indices" key never seems to be used, so Alex is commenting it out for now.
    // if(key == "indices")
    // {
    //   self._filterIndices();
    //   self._schedule_update({update_indices:true, render_selection:true});
    // }

    // else if(key == "x_label")
    if(key == "x_label")
    {
      self._schedule_update({update_x_label:true});
    }

    else if(key == "y_label")
    {
      self._schedule_update({update_y_label:true});
    }

    else if(key == "v_label")
    {
      self._schedule_update({update_v_label:true});
    }

    else if(key == "x")
    {
      if(self.options["auto-scale"])
      {
        self.options.filtered_x = self._filterValues(self.options.x);
        self.options.scale_x = self.options.filtered_x;
      }
      else
      {
        self.options.scale_x = self.options.x;
      }
      self._filterIndices();
      self._close_hidden_simulations();
      self.set_x_y_v_axes_types();
      self._schedule_update({update_x:true, update_leaders:true, render_data:true, render_selection:true});
    }

    else if(key == "y")
    {
      self.set_x_y_v_axes_types();
      if(self.options["auto-scale"])
      {
        self.options.filtered_y = self._filterValues(self.options.y);
        self.options.scale_y = self.options.filtered_y;
      }
      else
      {
        self.options.scale_y = self.options.y;
      }
      self._filterIndices();
      self._close_hidden_simulations();
      self._schedule_update({update_y:true, update_leaders:true, render_data:true, render_selection:true});
    }

    else if(key == "v")
    {
      self.set_x_y_v_axes_types();
      if(self.options["auto-scale"])
      {
        self.options.filtered_v = self._filterValues(self.options.v);
        self.options.scale_v = self.options.filtered_v;
      }
      else
      {
        self.options.scale_v = self.options.v;
      }
      self._schedule_update({render_data:true, render_selection:true, update_legend_axis:true});
    }

    else if(key == "images")
    {
    }

    else if(key == "selection")
    {
      self._filterIndices();
      self._schedule_update({render_selection:true});
    }

    else if(key == "colorscale")
    {
      self._schedule_update({render_data:true, render_selection:true});
    }

    else if(key == "width")
    {
      self._schedule_update({update_width:true, update_x:true, update_leaders:true, render_data:true, render_selection:true});
    }

    else if(key == "height")
    {
      self._schedule_update({update_height:true, update_y:true, update_y_label:true, update_leaders:true, render_data:true, render_selection:true, update_legend_position:true, update_legend_axis:true, update_v_label:true,});
    }

    else if(key == "border")
    {
      self._schedule_update({update_x:true, update_y:true, update_leaders:true, render_data:true, render_selection:true, update_legend_position:true, update_v_label:true,});
    }

    else if(key == "gradient")
    {
      self._schedule_update({update_legend_colors:true, });
    }

    else if(key == "hidden_simulations")
    {
      // console.group(`parameter-image-scatterplot setOption "hidden_simulations"`);
      self._filterIndices();
      if(self.options["auto-scale"])
      {
        self.options.filtered_x = self._filterValues(self.options.x);
        self.options.filtered_y = self._filterValues(self.options.y);
        self.options.filtered_v = self._filterValues(self.options.v);
        self.options.scale_x = self.options.filtered_x;
        self.options.scale_y = self.options.filtered_y;
        self.options.scale_v = self.options.filtered_v;
      }
      else
      {
        self.options.scale_x = self.options.x;
        self.options.scale_y = self.options.y;
        self.options.scale_v = self.options.v;
      }
      self._schedule_update({update_x:true, update_y:true, update_leaders:true, render_data:true, render_selection:true, update_legend_axis:true});
      self._close_hidden_simulations();
      self._open_shown_simulations();
      // console.groupEnd();
    }

    else if(key == "auto-scale")
    {
      if(self.options["auto-scale"])
      {
        self.options.filtered_x = self._filterValues(self.options.x);
        self.options.filtered_y = self._filterValues(self.options.y);
        self.options.filtered_v = self._filterValues(self.options.v);
        self.options.scale_x = self.options.filtered_x;
        self.options.scale_y = self.options.filtered_y;
        self.options.scale_v = self.options.filtered_v;
      }
      else
      {
        self.options.scale_x = self.options.x;
        self.options.scale_y = self.options.y;
        self.options.scale_v = self.options.v;
      }
      self._schedule_update({update_x:true, update_y:true, update_leaders:true, render_data:true, render_selection:true, update_legend_axis:true});
    }
    else if(key == "video-sync")
    {
      if(self.options["video-sync"])
      {
        self._schedule_update({update_video_sync_time:true,});
      }
    }
    else if(key == "video-sync-time")
    {
      if(self.options["video-sync"])
      {
        self._schedule_update({update_video_sync_time:true,});
      }
    }
    else if(key == "threeD_sync")
    {
      if(self.options["threeD_sync"])
      {
        self._schedule_update({update_threeD_sync:true,});
      }
    }
  },

  update_color_scale_and_v: function(data)
  {
    var self = this;
    self.set_x_y_v_axes_types();
    self.options.colorscale = data.colorscale;
    self.options.v = data.v;
    if(data.v_string !== undefined)
    {
      self.options.v_string = data.v_string;
    }
    if(self.options["auto-scale"])
    {
      self.options.filtered_v = self._filterValues(self.options.v);
      self.options.scale_v = self.options.filtered_v;
    }
    else
    {
      self.options.scale_v = self.options.v;
    }
    self._schedule_update({render_data:true, render_selection:true, update_legend_axis:true});
  },

  _schedule_update: function(updates)
  {
    var self = this;

    for(var key in updates)
      self.updates[key] = updates[key];

    if(self.update_timer)
      return;

    self.update_timer = window.setTimeout(function() { self._update(); }, 0);
  },

  _update: function()
  {
    var self = this;

    //console.log("parameter_image.scatterplot._update()", self.updates);
    self.update_timer = null;

    var xoffset = 0;
    var legend_width = 150;

    if (self.updates.update_datum_width_height) {
      let total_width = self.options.width;
      let total_height = self.options.height;
      let width_height = Math.min(total_width, total_height);
      let width_offset = (total_width - width_height) / 2;
      let height_offset = (total_height - width_height) / 2;
      
      d3.select(self.canvas_datum)
        .style({
          left : (width_offset + self.options.border - (self.options.canvas_square_size / 2)) + "px",
          top : (height_offset + self.options.border - (self.options.canvas_square_size / 2)) + "px",
        })
        .attr("width", (width_height - (2 * self.options.border)) - xoffset + self.options.canvas_square_size)
        .attr("height", (width_height - (2 * self.options.border)) - 40 + self.options.canvas_square_size)
        ;
    }

    if (self.updates.update_selection_width_height) {
      let total_width = self.options.width;
      let total_height = self.options.height;
      let width_height = Math.min(total_width, total_height);
      let width_offset = (total_width - width_height) / 2;
      let height_offset = (total_height - width_height) / 2;
      
      d3.select(self.canvas_selected)
        .style({
          left : (width_offset + self.options.border - (self.options.canvas_selected_square_size / 2)) + "px",
          top : (height_offset + self.options.border - (self.options.canvas_selected_square_size / 2)) + "px",
        })
        .attr("width", (width_height - (2 * self.options.border)) - xoffset + self.options.canvas_selected_square_size)
        .attr("height", (width_height - (2 * self.options.border)) - 40 + self.options.canvas_selected_square_size)
        ;
    }

    if (self.updates.update_width) {
      self.element.attr("width", self.options.width);
      self.svg.attr("width", self.options.width);
      self.media_layer.style({"width": self.options.width + "px"});

      var total_width = self.options.width;
      var total_height = self.options.height;
      var width = Math.min(total_width, total_height);
      var width_offset = (total_width - width) / 2;

      d3.select(self.canvas_datum)
        .style({
          "left" : (width_offset + self.options.border - (self.options.canvas_square_size / 2)) + "px",
        })
        .attr("width", (width - (2 * self.options.border)) - xoffset + self.options.canvas_square_size)
        ;
      d3.select(self.canvas_selected)
        .style({
          "left" : (width_offset + self.options.border - (self.options.canvas_selected_square_size / 2)) + "px",
        })
        .attr("width", (width - (2 * self.options.border)) - xoffset + self.options.canvas_selected_square_size)
        ;
    }

    if (self.updates.update_height) {
      self.element.attr("height", self.options.height);
      self.svg.attr("height", self.options.height);
      self.media_layer.style({"height": self.options.height + "px"});

      var total_width = self.options.width;
      var total_height = self.options.height;
      var height = Math.min(total_width, total_height);
      var height_offset = (total_height - height) / 2;
      d3.select(self.canvas_datum)
        .style({
          "top" : (height_offset + self.options.border - (self.options.canvas_square_size / 2)) + "px",
        })
        .attr("height", (height - (2 * self.options.border)) - 40 + self.options.canvas_square_size)
        ;
      d3.select(self.canvas_selected)
        .style({
          "top" : (height_offset + self.options.border - (self.options.canvas_selected_square_size / 2)) + "px",
        })
        .attr("height", (height - (2 * self.options.border)) - 40 + self.options.canvas_selected_square_size)
        ;
    }

    if (self.updates.update_x) {
      var total_width = self.options.width;
      var total_height = self.options.height;
      var width = Math.min(self.options.width, self.options.height);
      var width_offset = (total_width - width) / 2;

      var range = [0 + width_offset + self.options.border, total_width - width_offset - self.options.border - xoffset];
      var range_canvas = [0, width - (2 * self.options.border) - xoffset];

      self.set_custom_axes_ranges();
      self.x_scale = self._createScale(
        self.options.x_string, 
        self.options.scale_x, 
        range, 
        false, 
        self.options.x_axis_type, 
        'x'
      );
      self.x_scale_canvas = self._createScale(
        self.options.x_string, 
        self.options.scale_x, 
        range_canvas, 
        false, 
        self.options.x_axis_type, 
        'x'
      );

      var height = Math.min(self.options.width, self.options.height);
      var height_offset = (total_height - height) / 2;
      self.x_axis_offset = total_height - height_offset - self.options.border - 40;
      self.x_axis = d3.svg.axis()
        .scale(self.x_scale)
        .orient("bottom")
        // Set number of ticks based on width of axis.
        .ticks(range_canvas[1]/85)
        // Forces ticks at min and max axis values, but sometimes they collide
        // with other ticks and sometimes they get rounded.
        // .tickValues( self.x_scale.ticks( range_canvas[1]/85 ).concat( self.x_scale.domain() ) )
        // .tickSize(15)
        ;
      self.x_axis_layer
        .attr("transform", "translate(0," + self.x_axis_offset + ")")
        .call(self.x_axis)
        // Selecting all the labels and rotating them 45 degrees around their start
        .selectAll("text")  
          // .style("text-anchor", "end")
          .style("text-anchor", "start")
          .style("font-size", self.options.axes_font_size + 'px')
          .style("font-family", self.options.axes_font_family)
          // .attr("dx", "0em")
          // .attr("dy", "0em")
          // .attr("x", "0")
          // .attr("y", "0")
          .attr("transform", "rotate(15)")
        ;
      // Updating the x_label here because updating_x clears the label for some reason
      self._schedule_update({update_x_label:true});
    }

    if (self.updates.update_y) {
      var total_width = self.options.width;
      var total_height = self.options.height;
      var width = Math.min(self.options.width, self.options.height);
      var height = Math.min(self.options.width, self.options.height);
      var width_offset = (total_width - width) / 2
      var height_offset = (total_height - height) / 2
      var range = [total_height - height_offset - self.options.border - 40, 0 + height_offset + self.options.border];
      var range_canvas = [height - (2 * self.options.border) - 40, 0];
      self.y_axis_offset = 0 + width_offset + self.options.border;

      self.set_custom_axes_ranges();
      self.y_scale = self._createScale(
        self.options.y_string, 
        self.options.scale_y, 
        range, 
        false, 
        self.options.y_axis_type,
        'y'
      );
      self.y_scale_canvas = self._createScale(
        self.options.y_string, 
        self.options.scale_y, 
        range_canvas, 
        false, 
        self.options.y_axis_type,
        'y'
      );

      self.y_axis = d3.svg.axis()
        .scale(self.y_scale)
        .orient("left")
        // Set number of ticks based on height of axis.
        .ticks(range_canvas[0]/50)
        // Forces ticks at min and max axis values, but sometimes they collide
        // with other ticks and sometimes they get rounded.
        // .tickValues( self.y_scale.ticks( range_canvas[0]/50 ).concat( self.y_scale.domain() ) )
        ;
      self.y_axis_layer
        .attr("transform", "translate(" + self.y_axis_offset + ",0)")
        .call(self.y_axis)
        .selectAll("text")  
          .style("font-size", self.options.axes_font_size + 'px')
          .style("font-family", self.options.axes_font_family)
        ;
    }

    if (self.updates.update_indices) {
      self.inverse_indices = {};
      var count = self.options.indices.length;
      for(var i = 0; i != count; ++i)
        self.inverse_indices[self.options.indices[i]] = i;
    }

    if (self.updates.update_x_label) {
      // This is the vertical offset of the x-axis label.
      var y = 5;

      // This is the horizontal offset of the x-axis label. Set to align with the end of the axis.
      var width = Math.min(self.options.width, self.options.height);
      var x_axis_width = width - (2 * self.options.border) - xoffset;
      var x_remaining_width = self.svg.attr("width") - x_axis_width;
      var x = (x_remaining_width / 2) + x_axis_width + 40;

      self.x_axis_layer.selectAll(".label").remove()
      self.x_axis_layer.append("text")
        .attr("class", "label")
        .attr("x", x)
        .attr("y", y)
        .style("text-anchor", "start")
        .style("font-weight", "bold")
        .style("font-size", self.options.axes_font_size + 'px')
        .style("font-family", self.options.axes_font_family)
        .text(self.options.x_label)
        ;
    }

    if (self.updates.update_y_label) {
      self.y_axis_layer.selectAll(".label").remove();

      var y_axis_width = self.y_axis_layer.node().getBBox().width;
      var x = -(y_axis_width+15);
      var y = self.svg.attr("height") / 2;

      self.y_axis_layer.append("text")
        .attr("class", "label")
        .attr("x", x)
        .attr("y", y)
        .attr("transform", "rotate(-90," + x +"," + y + ")")
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-size", self.options.axes_font_size + 'px')
        .style("font-family", self.options.axes_font_family)
        .text(self.options.y_label)
        ;
    }

    if (self.updates.render_data) {
      var x = self.options.x,
          y = self.options.y,
          v = self.options.v,
          filtered_indices = self.options.filtered_indices,
          canvas = self.canvas_datum_layer,
          i = -1,
          n = filtered_indices.length,
          cx,
          cy,
          color,
          square_size = self.options.canvas_square_size,
          border_width = self.options.canvas_square_border_size,
          half_border_width = border_width / 2,
          fillWidth = square_size - (2 * border_width),
          fillHeight = fillWidth,
          strokeWidth = square_size - border_width,
          strokeHeight = strokeWidth;

      // Draw points on canvas ...
      var time = Date;
      if(window.performance)
        time = window.performance;
      var start = time.now();

      canvas.clearRect(0, 0, self.canvas_datum.width, self.canvas_datum.height);
      canvas.strokeStyle = "black";
      canvas.lineWidth = border_width;

      while (++i < n) {
        let index = filtered_indices[i];
        if(self._is_off_axes(index))
        {
          // console.log(`this point is off axes, so skipping: ${index}`);
          continue;
        }
        let value = v[index];
        if(!self._validateValue(value))
          color = $("#color-switcher").colorswitcher("get_null_color");
        else if( !isValueInColorscaleRange(value, self.options.colorscale) )
          color = $("#color-switcher").colorswitcher("get_outofdomain_color");
        else
          color = self.options.colorscale(value);
        canvas.fillStyle = color;
        cx = Math.round(self.x_scale_canvas_format(x[index]));
        cy = Math.round(self.y_scale_canvas_format(y[index]));
        // Skip this point if its x or y coordinates are NaN
        if(isNaN(cx) || isNaN(cy))
          continue;
        canvas.fillRect(cx + border_width, cy + border_width, fillWidth, fillHeight);
        if(border_width > 0)
        {
          canvas.strokeRect(cx + half_border_width, cy + half_border_width, strokeWidth, strokeHeight);
        }
      }
      // Test point for checking position and border
      // canvas.fillStyle = "white";
      // canvas.fillRect(0 + 0.5, 0 + 0.5, width, height);
      // canvas.strokeRect(0 + 0.5, 0 + 0.5, width, height);
      var end = time.now();
      // console.log("Time to render " + filtered_indices.length + " canvas points: " + (end-start) + " milliseconds.");
    }

    if (self.updates.render_selection) {
      var x = self.options.x,
          y = self.options.y,
          v = self.options.v,
          filtered_selection = self.options.filtered_selection,
          canvas = self.canvas_selected_layer,
          i = -1,
          n = filtered_selection.length,
          cx,
          cy,
          color,
          square_size = self.options.canvas_selected_square_size,
          border_width = self.options.canvas_selected_square_border_size,
          half_border_width = border_width / 2,
          fillWidth = square_size - (2 * border_width),
          fillHeight = fillWidth,
          strokeWidth = square_size - border_width
          strokeHeight = strokeWidth;

      canvas.clearRect(0, 0, self.canvas_selected.width, self.canvas_selected.height);
      canvas.strokeStyle = "black";
      canvas.lineWidth = border_width;

      while (++i < n) {
        let index = filtered_selection[i];
        if(self._is_off_axes(index))
        {
          // console.log(`this point is off axes, so skipping: ${index}`);
          continue;
        }
        let value = v[index];
        if(!self._validateValue(value))
          color = $("#color-switcher").colorswitcher("get_null_color");
        else if( !isValueInColorscaleRange(value, self.options.colorscale) )
          color = $("#color-switcher").colorswitcher("get_outofdomain_color");
        else
          color = self.options.colorscale(value);
        canvas.fillStyle = color;
        cx = Math.round(self.x_scale_canvas_format(x[index]));
        cy = Math.round(self.y_scale_canvas_format(y[index]));
        canvas.fillRect(cx + border_width, cy + border_width, fillWidth, fillHeight);
        if(border_width > 0)
        {
          canvas.strokeRect(cx + half_border_width, cy + half_border_width, strokeWidth, strokeHeight);
        }
      }
    }

    // Used to open an initial list of images at startup only
    if(self.updates["open_images"])
    {
      // This is just a convenience for testing - in practice, these parameters should always be part of the open image specification.
      self.options.open_images.forEach(function(image)
      {
        if(image.uri === undefined)
          image.uri = self.options.images[image.index];
        if(image.width === undefined)
          image.width = self.options.pinned_width;
        if(image.height === undefined)
          image.height = self.options.pinned_height;
      });

      // Transform the list of initial images so we can pass them to _open_images()
      var width = Number(self.svg.attr("width"));
      var height = Number(self.svg.attr("height"));

      var images = [];
      self.options.open_images.forEach(function(image, index)
      {
        // Making sure we have an index and uri before attempting to open an image
        if(image.index != null && image.uri != undefined)
        {
          images.push({
            index : image.index,
            uri : image.uri.trim(),
            uid : image.uid,
            image_class : "open-image",
            x : width * image.relx,
            y : height * image.rely,
            width : image.width,
            height : image.height,
            target_x : self.x_scale_format(self.options.x[image.index]),
            target_y : self.y_scale_format(self.options.y[image.index]),
            video : image.video,
            currentTime : image.currentTime,
            current_frame : image.current_frame,
            initial : true,
            });
        }
        if(image.current_frame)
        {
          self.current_frame = image.index;
        }
      });
      self._open_images(images);
    }

    // Update leader targets anytime we resize or change our axes ...
    if(self.updates["update_leaders"])
    {
      $(".open-image").each(function(index, frame)
      {
        var frame = $(frame);
        var image_index = Number(frame.attr("data-index"));
        var uid = frame.attr("data-uid");
        self.line_layer.select("line[data-uid='" + uid + "']")
          .attr("x2", self.x_scale_format(self.options.x[image_index]) )
          .attr("y2", self.y_scale_format(self.options.y[image_index]) )
          .attr("data-targetx", self.x_scale_format(self.options.x[image_index]))
          .attr("data-targety", self.y_scale_format(self.options.y[image_index]))
          ;
      });
    }

    if(self.updates["render_legend"])
    {
      var gradient = self.legend_layer
        .append("defs")
        .append("linearGradient")
        ;
      gradient
        .attr("id", "color-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%")
        ;

      var colorbar = self.legend_layer.append("rect")
        .classed("color", true)
        .attr("width", 10)
        .attr("height", 200)
        .attr("x", 0)
        .attr("y", 0)
        .style("fill", "url(#color-gradient)")
        ;
    }

    if(self.updates["update_legend_colors"])
    {
      var gradient = self.legend_layer.select("#color-gradient");
      var stop = gradient.selectAll("stop").data(self.options.gradient);
      stop.exit().remove();
      stop.enter().append("stop");
      stop
        .attr("offset", function(d) { return d.offset + "%"; })
        .attr("stop-color", function(d) { return d.color; })
        ;
    }

    if(self.updates["update_legend_position"])
    {
      var total_width = Number(self.options.width);
      var total_height = Number(self.options.height);
      var width = Math.min(self.options.width, self.options.height);
      var height = Math.min(self.options.width, self.options.height);
      var rectHeight = parseInt((height - self.options.border - 40)/2);
      var y_axis_layer_width = self.y_axis_layer.node().getBBox().width;
      var x_axis_layer_width = self.x_axis_layer.node().getBBox().width;
      var width_offset = (total_width + x_axis_layer_width) / 2;

      if( self.legend_layer.attr("data-status") != "moved" )
      {
        const transx = parseInt(y_axis_layer_width - 75 + width_offset);
        const transy = parseInt((total_height/2)-(rectHeight/2));
         self.legend_layer
          .attr("transform", "translate(" + transx + "," + transy + ")")
          .attr("data-transx", transx)
          .attr("data-transy", transy)
          ;
      }

      self.legend_layer.select("rect.color")
        .attr("height", rectHeight)
        ;
    }

    if(self.updates["update_legend_axis"])
    {
      var range = [0, parseInt(self.legend_layer.select("rect.color").attr("height"))];
      self.set_custom_axes_ranges();

      // self.legend_scale = self._createScale(self.options.v_string, self.options.scale_v, range, true, self.options.v_axis_type);
      self.legend_scale = self._createScale(
        self.options.v_string, 
        self.options.scale_v, 
        range, 
        true,
        self.options.v_axis_type,
        'v'
      );

      self.legend_axis = d3.svg.axis()
        .scale(self.legend_scale)
        .orient("right")
        .ticks(range[1]/50)
        // Forces ticks at min and max axis values, but sometimes they collide
        // with other ticks and sometimes they get rounded.
        // .tickValues( self.legend_scale.ticks( range[1]/50 ).concat( self.legend_scale.domain() ) )
        ;
      self.legend_axis_layer
        .attr("transform", "translate(" + parseInt(self.legend_layer.select("rect.color").attr("width")) + ",0)")
        .call(self.legend_axis)
        .style("font-size", self.options.axes_font_size + 'px')
        .style("font-family", self.options.axes_font_family)
        ;
    }

    if(self.updates["update_v_label"])
    {
      // console.log("updating v label.");
      self.legend_layer.selectAll(".label").remove();

      var rectHeight = parseInt(self.legend_layer.select("rect.color").attr("height"));
      var x = -15;
      var y = rectHeight/2;

      self.legend_layer.append("text")
        .attr("class", "label")
        .attr("x", x)
        .attr("y", y)
        .attr("transform", "rotate(-90," + x +"," + y + ")")
        .style("font-size", self.options.axes_font_size + 'px')
        .style("font-family", self.options.axes_font_family)
        .text(self.options.v_label)
        ;
    }

    if(self.updates["update_video_sync_time"])
    {
      self._update_video_sync_time();
    }

    self.updates = {}
  },

  _update_video_sync_time: function()
  {
    var self = this;
    // Updating videos' sync time should not fire off additional seeked events
    $(".open-image video").each(function(index, video)
    {
      // Only update currentTime if the video is not playing
      var videoSyncTime = self.options["video-sync-time"];
      var playing = self._is_video_playing(video);
      if(!playing)
      {
        self.syncing_videos.push($(video.parentElement).data('index'));
        video.currentTime = Math.min(videoSyncTime, video.duration-0.000001);
      }
    });
    self._sync_open_media();
  },

  _update_threeD_sync: function()
  {
    // Not sure what to do here yet.
  },

  _sync_open_media: function()
  {
    var self = this;

    // Get the scatterplot width so we can convert absolute to relative coordinates.
    var width = Number(self.svg.attr("width"));
    var height = Number(self.svg.attr("height"));

    self.options.open_images = [];
    
    $(".open-image")
      // Sort .open-images by their z-index
      .sort(function(a, b){
        return parseInt(a.style['z-index'], 10) - parseInt(b.style['z-index'], 10);
      })
      .each(function(index, frame){
        var frame = $(frame);
        var open_element = {
          index : Number(frame.attr("data-index")),
          uri : frame.attr("data-uri"),
          uid : frame.attr("data-uid"),
          x : Number(frame.attr("data-transx")),
          y : Number(frame.attr("data-transy")),
          relx : Number(frame.attr("data-transx")) / width,
          rely : Number(frame.attr("data-transy")) / height,
          width : frame.outerWidth(),
          height : frame.outerHeight(),
          current_frame : frame.hasClass("selected"),
        };
        var video = frame.find('video')[0];
        if(video != undefined)
        {
          var currentTime = video.currentTime;
          open_element["currentTime"] = currentTime;
          open_element["video"] = true;
          open_element["playing"] = self._is_video_playing(video);
        }
        var threeD = frame.find('.vtp')[0];
        if(threeD != undefined)
        {
          open_element["threeD"] = true;
        }
        self.options.open_images.push(open_element);
      })
      ;

    window.store.dispatch(setOpenMedia(self.options.open_images));
  },

  _is_video_playing: function(video)
  {
    var playing = !!(/*video.currentTime > 0 &&*/ !video.paused && !video.ended && video.readyState > 2);
    // console.log("****************" + playing + ": video is playing? " + playing);
    // console.log("currentTime: " + video.currentTime + ", paused: " + video.paused + ", ended: " + video.ended + ", readyState: " + video.readyState);
    return playing;
  },

  _open_images: function(images)
  {
    var self = this;
    // If the list of images is empty, we're done.
    if(images.length == 0) return;
    var image = images[0];

    const isVtp = image.uri.endsWith('.vtp');
    const isStl = image.uri.endsWith('.stl');

    var frame_html = null;

    let within_svg = function(e, options) {
      return 0 <= e.y && e.y <= options.height && 0 <= e.x && e.x <= options.width;
    }

    var add_resize_handle = function(fh) {
      fh.append("i")
        .attr("class", "resize-handle frame-button fa fa-expand fa-rotate-90")
        .attr("aria-hidden", "true")
        .attr("title", "Resize")
        .call(
          d3.behavior.drag()
            .on('drag', handlers["resize"])
            .on('dragstart', handlers["resize_start"])
            .on('dragend', handlers["resize_end"])
        )
    };

    var add_pin_button = function(fh) {
      fh.append("i")
        .attr('class', 'pin-button frame-button fa fa-thumb-tack')
        .attr('title', 'Pin')
        .attr("aria-hidden", "true")
        .on("click", handlers["pin"])
        ;
    };

    var add_max_button = function(fh) {
      fh.append("i")
        .attr('class', 'max-button frame-button fa fa-window-maximize')
        .attr('title', 'Maximize')
        .attr("aria-hidden", "true")
        .on("click", handlers["maximize"])
        ;
    }

    var add_min_button = function(fh) {
      fh.append("i")
        .attr('class', 'min-button frame-button fa fa-window-minimize')
        .attr('title', 'Minimize')
        .attr("aria-hidden", "true")
        .on("click", handlers["minimize"])
        ;
    }

    var add_download_button = function(fh, uri, filename) {
      fh.append("a")
        .attr('href', uri)
        .attr('class', 'download-button frame-button fa fa-download')
        .attr('title', 'Download media file')
        .attr('download', filename)
        ;
    };

    var add_jump_button = function(fh, index) {
      var container = fh.append("span")
        .attr("class", "jump-button frame-button")
        .on("click", handlers["jump"]);
        ;

      container.append("i")
        .attr('class', 'table-button jump-button frame-button fa fa-table')
        .attr('title', 'Jump to row ' + index + ' in table')
        .attr("aria-hidden", "true")
        ;

      container.append("i")
        .attr('class', 'arrow-button jump-button frame-button fa fa-arrow-right')
        .attr('title', 'Jump to row ' + index + ' in table')
        .attr("aria-hidden", "true")
        ;
        
      container.append("span")
        .attr('class', 'table-index jump-button frame-button')
        .attr('title', 'Index of current media. Click to jump to row ' + index + ' in table.')
        .attr("aria-hidden", "true")
        .text(index)
        ;
    };

    var add_clone_button = function(fh) {
      // console.log(`Adding clone button for 3D media...`);
      fh.append("i")
        .attr('class', 'clone-button frame-button fa fa-clone')
        .attr('title', 'Clone')
        .attr('aria-hidden', 'true')
        .on('click', handlers["clone"])
        ;
    }

    var build_frame_html = function(img) {
      // Define a default size for every image.
      if(!img.width)
        img.width = self.options.pinned_width;
      if(!img.height)
        img.height = self.options.pinned_height;

      // Define a default position for every image.
      if(img.x === undefined)
      {
        img.x = self._getDefaultXPosition(img.index, img.width);
      }
      if(img.y === undefined)
      {
        img.y = self._getDefaultYPosition(img.index, img.height);
      }

      // Increment self.options.highest_z_index before assigning it
      self.options.highest_z_index++;

      var frame_html = self.media_layer.append("div")
        .attr("data-uri", img.uri)
        .attr("data-uid", img.uid)
        .attr("data-transx", img.x)
        .attr("data-transy", img.y)
        .style({
          "left": img.x + "px",
          "top": img.y + "px",
          "width": img.width + "px",
          "height": img.height + 20 + "px",
          "z-index": self.options.highest_z_index,
        })
        .attr("class", img.image_class + " image-frame scaffolding html ")
        .classed("selected", img.current_frame)
        .attr("data-index", img.index)
        .call(
          d3.behavior.drag()
            .on('drag', handlers["move"])
            .on("dragstart", handlers["move_start"])
            .on("dragend", handlers["move_end"])
        )
        .on("mousedown", handlers["frame_mousedown"])
        ;

      var footer = frame_html.append("div")
        .attr("class", "frame-footer")
        ;

      // Create a close button ...
      var close_button_html = footer.append("i")
        .attr("class", "close-button frame-button fa fa-times")
        .attr("aria-hidden", "true")
        .attr("title", "Close")
        .on("click", handlers["close"])
        ;

      // Create the leader line ...
      if("target_x" in img && "target_y" in img)
      {
        self.line_layer.append("line")
          .attr("data-uri", img.uri)
          .attr("data-uid", img.uid)
          .attr("class", "leader")
          .attr("x1", img.x + (img.width / 2))
          .attr("y1", img.y + (img.height / 2))
          .attr("x2", img.target_x)
          .attr("y2", img.target_y)
          .attr("data-targetx", img.target_x)
          .attr("data-targety", img.target_y)
          .style("stroke", "black")
          .style("stroke-width", 1.0)
          ;
      }

      // Create the loading image ...
      var loading_image = frame_html.append("div")
        .attr("class", "loading-image");

      // Schedule timeout for hover
      self.element.one("mousemove", handlers["hover"]);

      return frame_html;
    };

    var handlers = {
      move: function() {
        // console.log("move");
        var theElement, transx, transy;
        if (within_svg(d3.event, self.options)) {
          theElement = d3.select(this);
          transx = Number(theElement.attr("data-transx")) + d3.event.dx;
          transy = Number(theElement.attr("data-transy")) + d3.event.dy;
          theElement.attr("data-transx", transx).attr("data-transy", transy).style({
            left: transx + "px",
            top: transy + "px"
          });
          self._adjust_leader_line(theElement);
        }

        // Remove maximized class from frame
        d3.select(this).classed("maximized", false);
      },
      move_start: function() {
        // console.log("move_start");

        // Showing the mouseEventOverlay
        $(".mouseEventOverlay", this.closest(".image-frame")).show();

        var frame, sourceEventTarget;
        self.state = "moving";
        sourceEventTarget = d3.select(d3.event.sourceEvent.target);

        if ( sourceEventTarget.classed("image-frame") || 
             sourceEventTarget.classed("image") || 
             // For when dragging the black footer bar with icons
             sourceEventTarget.classed("frame-footer") || 
             sourceEventTarget.classed("bootstrap-styles") || 
             d3.event.sourceEvent.target.nodeName == "VIDEO"
           ) 
        {
          frame = d3.select(this);

          // Can't remove maximized class here, because move_start gets called
          // on a click of the frame footer.
          // // Remove maximized class from frame
          // frame.classed("maximized", false);

          self._cancel_hover_state(frame, image);
        }
      },
      move_end: function() {
        // console.log("move_end");

        // Hiding the mouseEventOverlay
        $(".mouseEventOverlay", this.closest(".image-frame")).hide();

        self.state = "";
        self._sync_open_media();
      },
      close: function() {
        // console.log("close click");
        var frame = d3.select(d3.event.target.closest(".image-frame"));
        self._remove_image_and_leader_line(frame);
        self._sync_open_media();
      },
      frame_mousedown: function(){
        // console.log("frame_mousedown");
        var target = d3.select(d3.event.target);
        // Do nothing if close button was clicked because we don't want to shift focus to frame that's about to be closed
        if(target.classed("close-button"))
        {
          return;
        }
        // Move the frame to the front.
        self._move_frame_to_front(this);
      },
      hover: function() {
        self._clear_hover_timer();
        return self.close_hover_timer = window.setTimeout((function() {
          return self._hover_timeout(image.index, 0);
        }), 1000);
      },
      resize: function() {
        // console.log("resize");
        var frame, min, target_width, target_height, x, y;
        min = 50;
        x = d3.event.x;
        y = d3.event.y;
        if (0 <= y && y <= self.options.height && 0 <= x && x <= self.options.width && x > min && y > min) {
          frame = d3.select(this.closest(".image-frame"));
          var ratio = frame.attr("data-ratio") ? frame.attr("data-ratio") : 1;
          var video = frame.attr("data-type") == "video";
          target_width = self._scale_width(ratio, x, y);
          target_height = self._scale_height(ratio, x, y);
          target_height += 20;
          frame.style({
            width: target_width + "px",
            height: target_height + "px"
          });
          self._adjust_leader_line(frame);
        }

        $(window).trigger('resize');
      },

      resize_start: function() {
        // console.log("resize_start");

        // Showing the mouseEventOverlay
        $(".mouseEventOverlay", this.closest(".image-frame")).show();

        // Need to explicitly move the frame to the front on resize_start because we stopPropagation later in this 
        // event handler and that stops the mousedown handler from moving the frame to the front automatically.
        self._move_frame_to_front(this.closest(".image-frame"));
        var frame;
        self.state = "resizing";
        frame = d3.select(this.closest(".image-frame"));
        // Add resizing class to scatterplot to use CSS to keep cursor as arrow while resizing
        d3.select("#scatterplot").classed("resizing", true);

        self._cancel_hover_state(frame, image);

        // Remove maximized class from frame
        frame.classed("maximized", false);

        // Need to stopPropagation here otherwise the system thinks we are moving the frame and does that instead of resize
        d3.event.sourceEvent.stopPropagation();
      },

      resize_end: function() {
        // console.log("resize_end");

        // Hiding the mouseEventOverlay
        $(".mouseEventOverlay", this.closest(".image-frame")).hide();

        d3.selectAll([this.closest(".image-frame"), d3.select("#scatterplot").node()]).classed("resizing", false);
        self.state = "";
        self._sync_open_media();
        // d3.event.sourceEvent.stopPropagation();

        // Fire a custom reize event to let vtk viewers know it was resized
        if(this.closest('.image-frame').querySelector('.vtp'))
        {
          this.closest('.image-frame').querySelector('.vtp').dispatchEvent(vtkresize_event);
        }
      },

      maximize: function() {
        let target = d3.event.target;
        let frame = d3.select(target.closest(".image-frame"));

        // Remove frame's hover state
        self._cancel_hover_state(frame, image);

        // Get the SVG pane's size
        var $svg = $('#scatterplot svg');
        var svgh = $svg.height();
        var svgw = $svg.width();

        // Get the frame's current location and size
        let x = frame.attr('data-transx');
        let y = frame.attr('data-transy');
        let width = $(frame.node()).outerWidth();
        let height = $(frame.node()).outerHeight();

        // Save the frame's current location and size in its data attributes, 
        // as minimized location and size, so we can restore to this size on minimize.
        frame.attr('data-minx', x);
        frame.attr('data-miny', y);
        frame.attr('data-minwidth', width);
        frame.attr('data-minheight', height);

        // Calculate new maxmized frame size
        let ratio = frame.attr("data-ratio") ? frame.attr("data-ratio") : 1;
        let target_height = svgh;
        let target_width = svgh * ratio;

        // Calculate available maximized frame x coordinates
        // Horizontal spacing between maximized frames
        let spacing = 120;
        let available = [0];
        while(svgw >= (available[available.length - 1] + target_width + spacing))
        {
          available.push(available[available.length - 1] + spacing);
        }

        // Calculate new maxmized frame location
        // Find all other maximized frames
        let maximized_frames = $(".media-layer div.image-frame.maximized");
        let used = [];
        // Calculate max x of maximized frames
        maximized_frames.each(function(index){
          used.push(Number($(this).attr('data-transx')));
        });
        // Find first unused slot
        let next = _.head(_.difference(available, used));
        // If there are no unused slots, get the least used one
        if (next == undefined)
        {
          next = _.head(_(used).countBy().entries().minBy('[1]'));
        }

        let target_x = next;
        let target_y = 0;

        // Maximize the frame and write its new size and location into its data attributes
        frame
          .attr("data-transx", target_x)
          .attr("data-transy", target_y)
          // .attr("data-width", target_width)
          // .attr("data-height", target_height)
          .style({
            left: target_x + "px",
            top: target_y + "px",
            width: target_width + "px",
            height: target_height + "px",
          })
          ;

        // Add maximized class to frame
        frame.classed("maximized", true);

        self._adjust_leader_line(frame);
        self._sync_open_media();

        $(window).trigger('resize');
      },

      minimize: function() {
        let target = d3.event.target;
        let frame = d3.select(target.closest(".image-frame"));

        // Remove maximized class from frame
        frame.classed("maximized", false);

        // Get the frame's previous location and size
        let target_x = frame.attr('data-minx');
        let target_y = frame.attr('data-miny');
        let target_width = frame.attr('data-minwidth');
        let target_height = frame.attr('data-minheight');

        // Restore the frame and write its new size and location into its data attributes
        frame
          .attr("data-transx", target_x)
          .attr("data-transy", target_y)
          .attr("data-width", target_width)
          .attr("data-height", target_height)
          .style({
            left: target_x + "px",
            top: target_y + "px",
            width: target_width + "px",
            height: target_height + "px",
          })
          ;

        self._adjust_leader_line(frame);
        self._sync_open_media();

        $(window).trigger('resize');
      },

      pin: function() {
        // console.log("pin event handler running");
        var frame, imageHeight, imageWidth, target_width, target_height, x, y;
        frame = d3.select(d3.event.target.closest(".image-frame"));
        self._cancel_hover_state(frame, image);

        // Remove maximized class from frame
        frame.classed("maximized", false);

        imageWidth = self.options.pinned_width;
        imageHeight = self.options.pinned_height;

        var $svg = $('#scatterplot svg');
        var svgw = $svg.height();
        var svgh = $svg.width();

        if (imageWidth >= svgw || imageHeight >= svgh) {
          imageWidth = Math.min(svgw, svgh) - 20;
          imageHeight = imageWidth;
        }

        var ratio = frame.attr("data-ratio") ? frame.attr("data-ratio") : 1;
        target_width = self._scale_width(ratio, imageWidth, imageHeight);
        target_height = self._scale_height(ratio, imageWidth, imageHeight);
        // Adding 20 pixels to make room for the footer with buttons
        target_height += 20;
        x = self._getDefaultXPosition(image.index, imageWidth);
        y = self._getDefaultYPosition(image.index, imageHeight);

        frame
          .attr("data-transx", x)
          .attr("data-transy", y)
          // .attr("data-width", target_width)
          // .attr("data-height", target_height)
          .style({
            left: x + "px",
            top: y + "px",
            width: target_width + "px",
            height: target_height + "px",
          })
          ;

        self._adjust_leader_line(frame);
        self._sync_open_media();

        $(window).trigger('resize');
      },

      pause_video: function(){
        video_sync_time_changed(self);
      },

      seeked_video: function(){
        video_sync_time_changed(self);
      },
      
      jump: function(){
        // console.log("jump event handler running");
        var index = d3.select(d3.event.target.closest(".image-frame")).attr("data-index");
        self.element.trigger("jump_to_simulation", index);
      },

      clone: function(){
        // console.log(`About to clone this frame...`);
        const frame = d3.select(d3.event.target.closest(".image-frame"));
        const width = frame.node().offsetWidth;
        const height = frame.node().offsetHeight;
        const index = frame.attr("data-index");
        const x = +frame.attr("data-transx") + width;
        const y = frame.attr("data-transy");
        self._open_images([{
          index : index,
          uri : frame.attr("data-uri"),
          image_class : "open-image",
          x : x,
          y : y,
          target_x : self.x_scale_format(self.options.x[index]),
          target_y : self.y_scale_format(self.options.y[index]),
          width : width,
          height : height,
          clone : true,
        }]);
      }
    }

    function video_sync_time_changed(self_passed)
    {
      var self = self_passed;
      if(self.options["video-sync"])
      {
        // Sync all videos to current video-sync-time
        self._schedule_update({update_video_sync_time:true,});
      }
      self.element.trigger("video-sync-time", self.options["video-sync-time"]);
      self._sync_open_media();
    }

    // Don't open images for hidden simulations
    if($.inArray(image.index, self.options.hidden_simulations) != -1) {
      self._open_images(images.slice(1));
      return;
    }

    // Don't open images for off axes simulations
    if(self._is_off_axes(image.index)) {
      self._open_images(images.slice(1));
      return;
    }

    // Don't open media if it's already open, unless we are cloning or it's the initial set
    if(
      !image.initial
      && !image.clone
      && $(`.open-image[data-uri='${image.uri}']:not(.scaffolding)`).length > 0
    )
    {
      self._open_images(images.slice(1));
      // console.log(`Skipped opening media at ${image.uri} because it's already open.`);
      return;
    }

    // If image is hover and we are no longer loading this image, we're done.
    if( image.image_class == "hover-image" && self.opening_image != image.index) {
      return;
    }

    // Add a UID if there isn't one already.
    if(image.uid === undefined) {
      image.uid = uuidv4();
    }

    // Create scaffolding and status indicator if we already don't have one 
    if( 
      self.media_layer
        .select(`div[data-uid='${image.uid}']`)
        .filter(`.${image.image_class},.open-image`)
        .empty()
    )
    {
      // console.debug(`build_frame_html for image %o`, image);
      frame_html = build_frame_html(image);
    }

    // If the URI is a web URL (http or https)
    var uri = URI(image.uri);
    var link = self.options.link_protocols.indexOf(uri.protocol()) > -1;
    var already_cached = image.uri in self.options.image_cache;
    if(link || already_cached)
    {
      // Define a default size for every image.
      if(image.width === undefined) {
        image.width = self.options.pinned_width;
      }

      if(image.height === undefined) {
        image.height = self.options.pinned_height;
      }

      // Define a default position for every image.
      if(image.x === undefined) {
        image.x = self._getDefaultXPosition(image.index, image.width);
      }

      if(image.y === undefined) {
        image.y = self._getDefaultYPosition(image.index, image.height);
      }

      var frame_html = self.media_layer
        .select(`div.${image.image_class}[data-uid='${image.uid}']`)
        ;
      frame_html.classed("scaffolding", false);
      frame_html.select("span.reload-button").remove();

      // If the URL is a web link, create a link to open it in a new window
      if(link)
      {
        // Create a "open in new window" link for http or https URLs        
        frame_html
          .style({
            "width": image.width + "px",
            "height": image.height + "px",
          });
        self._adjust_leader_line(frame_html);
        var download = frame_html
          .append("a")
          .attr("href", uri)
          .attr("class", "open-link")
          .attr("target", "_blank")
          .text(image.uri)
          ;
      }

      // Otherwise if the image is already in the cache, display it.
      else if (already_cached) {
        // console.log("Displaying image " + image.uri + " from cache...");
        var url_creator = window.URL || window.webkitURL;
        var blob = self.options.image_cache[image.uri];
        var image_url = url_creator.createObjectURL(blob);

        if(blob.type.indexOf('image/') == 0) {
          // Create the html image ...
          var htmlImage = frame_html
            .append("img")
            .attr("class", "image resize")
            .attr("src", image_url)
            .attr("data-ratio", image.width / image.height)
            .style({
              "display": "none",
            })
            ;
          // Due to a Firefox bug where the load event handler is fired more than once, resulting in the image sometimes
          // growing in size when clicked (github issue #698 https://github.com/sandialabs/slycat/issues/698),
          // Alex is ensuring that it will only be executed once with the jQuery one() function.
          $(htmlImage.node()).one("load", function(){
              // Get the actual image dimensions
              // console.log("about to get actual image dimensions");
              var width = this.naturalWidth;
              var height = this.naturalHeight;
              var ratio = width/height;
              var target_width = self._scale_width(ratio, image.width, image.height);
              // Adjust dimensions of frame now that we know the dimensions of the image
              frame_html
                .attr("data-width", width)
                .attr("data-height", height)
                .attr("data-ratio", ratio)
                .style({
                  "width": target_width + "px",
                  "height": "auto",
                })
                ;
              htmlImage
                .style({
                  "display": "block",
                });
              self._adjust_leader_line(frame_html);
          });
        
        } else if(blob.type.indexOf('video/') == 0) {
          // Create the video ...
          var video = frame_html
            .append("video")
            .attr("data-uri", image.uri)
            .attr("data-uid", image.uid)
            .attr("src", image_url)
            .attr("controls", true)
            .attr("loop", true)
            .style({
              "display": "none",
            })
            .on("mousedown", function(event){
              // console.log("video onmousedown");
            })
            .on("click", function(event){
              // console.log("video onclick");
            })
            .on("loadedmetadata", function(){
              // console.log("onloadedmetadata");
              var width = this.videoWidth;
              var height = this.videoHeight;
              var ratio = width/height;
              var target_width = self._scale_width(ratio, image.width, image.height);
              // Remove dimensions from parent frame to have it size to image
              frame_html
                .attr("data-width", width)
                .attr("data-height", height)
                .attr("data-ratio", ratio)
                .attr("data-type", "video")
                .style({
                  "width": target_width + "px",
                  "height": "auto",
                });
              video
                .style({
                  "display": "block",
                });
              self._adjust_leader_line(frame_html);
              if(self.options["video-sync"] && this.currentTime != self.options["video-sync-time"])
              {
                self.syncing_videos.push(image.index);
                this.currentTime = self.options["video-sync-time"];
              }
            })
            .on("playing", function(){
              // console.log("onplaying");
              self._sync_open_media();
            })
            .on("pause", function(){
              // console.log("onpause");
              var pausing_index = self.pausing_videos.indexOf(image.index);
              // If video was directly paused by user, set a new video-sync-time and sync all other videos
              if(pausing_index < 0)
              {
                self.options["video-sync-time"] = this.currentTime;
                // Due to a Firefox bug, I need to set the paused video's time to it's currentTime because
                // Firefox pauses it a frame or two past where it claims the video is. Only need to do this
                // when video sync is off because when it's on, all videos, including current one, have their
                // currentTime updated.
                if(!self.options["video-sync"])
                {
                  this.currentTime = self.options["video-sync-time"];
                }
                handlers["pause_video"]();
                // Need to explicitly move the frame to the front when interacting with video controls because
                // Chrome does not propagate any mouse events after controls are clicked.
                self._move_frame_to_front(this.closest(".image-frame"));
              }
              // Do nothing if video was paused by system, just remove it from the paused videos list
              else
              {
                self.pausing_videos.splice(pausing_index, 1);
              }
            })
            .on("seeked", function(event){
              // console.log("onseeked");
              var index = self.syncing_videos.indexOf(image.index);
              if(index < 0)
              {
                self.options["video-sync-time"] = this.currentTime;
                handlers["seeked_video"]();
                let frame = d3.select(this.parentElement);
                self._cancel_hover_state(frame, image);
                // Need to explicitly move the frame to the front when interacting with video controls because
                // Chrome does not propagate any mouse events after controls are clicked.
                self._move_frame_to_front(this.closest(".image-frame"));
              }
              else
              {
                self.syncing_videos.splice(index, 1);
              }
            })
            .on("play", function(event){
              // console.log("onplay");
              let frame = d3.select(this.parentElement);
              self._cancel_hover_state(frame, image);

              var playing_index = self.playing_videos.indexOf(image.index);
              // If video was directly played by user
              if(playing_index < 0)
              {
                // Need to explicitly move the frame to the front when interacting with video controls because
                // Chrome does not propagate any mouse events after controls are clicked.
                self._move_frame_to_front(this.closest(".image-frame"));
              }
              // Do nothing if video was played by system, just remove it from the played videos list
              else
              {
                self.playing_videos.splice(playing_index, 1);
              }
            })
            .on("volumechange", function(event){
              // Need to explicitly move the frame to the front when interacting with video controls because
              // Chrome does not propagate any mouse events after controls are clicked.
              self._move_frame_to_front(this.closest(".image-frame"));
            })
            ;
          if(image.currentTime != undefined && image.currentTime > 0)
          {
            self.syncing_videos.push(image.index);
            video.property("currentTime", image.currentTime);
          }

        } else if(blob.type.indexOf('application/pdf') == 0) {
          // Create the pdf ...

          var pdfWidth = 320;

          // Using an embed element
          // var pdf = frame_html
          //   // Overriding width and height to keep 8.5/11 ratio that's more applicable to PDFs
          //   .style({
          //     "width": pdfWidth + "px",
          //     "height": (pdfWidth*(11/8.5))+10 + "px",
          //   })
          //   .attr("data-ratio", 8.5/11)
          //   .append("embed")
          //   .attr("data-uri", image.uri)
          //   .attr("src", image_url)
          //   .attr("type", "application/pdf")
          //   .attr("width", "100%")
          //   .attr("height", "100%")
          //   ;

          // Let's use an object element instead
          // var pdf = frame_html
          //   // Overriding width and height to keep 8.5/11 ratio that's more applicable to PDFs
          //   .style({
          //     "width": pdfWidth + "px",
          //     "height": (pdfWidth*(11/8.5))+10 + "px",
          //   })
          //   .attr("data-ratio", 8.5/11)
          //   .append("object")
          //   .attr("data-uri", image.uri)
          //   .attr("data", image_url)
          //   .attr("type", "application/pdf")
          //   .attr("width", "100%")
          //   .attr("height", "100%")
          //   ;

          // iframe
          // var pdf = frame_html
          //   // Overriding width and height to keep 8.5/11 ratio that's more applicable to PDFs
          //   .style({
          //     "width": pdfWidth + "px",
          //     "height": (pdfWidth*(11/8.5))+10 + "px",
          //   })
          //   .attr("data-ratio", 8.5/11)
          //   .append("iframe")
          //   .attr("data-uri", image.uri)
          //   .attr("src", image_url)
          //   // .attr("type", "application/pdf")
          //   .attr("width", "100%")
          //   .attr("height", "100%")
          //   .attr("frameborder", "0")
          //   .append("a")
          //   .attr("href", image_url)
          //   .attr("class", "download-link")
          //   .attr("download", "download")
          //   .text("Download " + image.uri)
          //   ;

          // Using an <object> with an <iframe> fallback will reach the most users.
          // https://pdfobject.com/static.html
          var pdf = frame_html
            .attr("data-ratio", 8.5/11)
            .append("object")
            .attr("data-uri", image.uri)
            .attr("data-uid", image.uid)
            .attr("data", image_url)
            .attr("type", "application/pdf")
            .attr("width", "100%")
            .attr("height", "100%")
            .append("iframe")
            .attr("data-uri", image.uri)
            .attr("data-uid", image.uid)
            .attr("src", image_url)
            // .attr("type", "application/pdf")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("frameborder", "0")
            .append("a")
            .attr("href", image_url)
            .attr("class", "download-link")
            .attr("download", "download")
            .text("Download " + image.uri)
            ;

          // Overriding width and height to keep 8.5/11 ratio that's more applicable to PDFs
          // This needs to happen only for new PDFs. Ones that are being re-opened at startup need to keep their restored size.
          // So we check for a width & height of 200, which only happens when new media is opened.
          if(image.width == 200 && image.height == 200)
          {
            // console.log('overriding initial pdf size');
            frame_html.style({
              "width": pdfWidth + "px",
              "height": (pdfWidth*(11/8.5))+10 + "px",
            })
          }
          // Adjusting frame size to remove additional 20px that's added during frame creation. Works for
          // other media, but caused PDF frame to grow by 20px each time the page is refreshed. So this
          // adjustment fixes that.
          else 
          {
            frame_html.style({"height": (parseInt(frame_html.style("height"))-20) + 'px'});
          }

          // Adding on overlay div to fix mouse event issues when resizing and dragging PDFs because the <object>, <iframe>,
          // and <embed> elements capture mouse events and don't propagate them to parent elements.
          // This div is above those elements but initially hidden. On resize and move events, it's displayed, thus
          // capturing mouse events and letting them bubble up to the parent frame instead of getting stuck in the 
          // PDF viewer.
          frame_html.append("div")
            .classed("mouseEventOverlay", true)
            ;

        }
        else if(isVtp || isStl)
        {
          // This is a VTP or STL file, so use the VTK 3d viewer
          let vtk = frame_html
            .append("div")
            .attr('class', 'vtp')
            .attr("width", "100%")
            .attr("height", "100%")
            ;
          // Adjusting frame size to remove additional 20px that's added during frame creation. Works for
          // other media, but caused VTP frame to grow by 20px each time the page is refreshed. So this
          // adjustment fixes that.
          frame_html.style({"height": (parseInt(frame_html.style("height"))-20) + 'px'});

          // Listen for vtk start interaction event (dispatched by vtk-geometry-viewer)
          // and move the frame to the front since mouse interaction in the vtk viewer
          // does not propagate.
          vtk.node().addEventListener('vtkstartinteraction', (e) => { 
            // console.log('vtkstartinteraction');
            self._move_frame_to_front(e.target.parentElement);
          }, false);

          // Convert the blob to an array buffer and pass it to the geometry loader
          function passToGeometryLoaded(buffer) {
            geometryLoad(
              vtk.node(),
              buffer,
              image.uri,
              image.uid,
              isStl ? 'stl' : 'vtp'
            );
            // dispatch vtk select event so we know which camera to sync
            if(image.current_frame) {
              frame_html.node().querySelector('.vtp').dispatchEvent(vtkselect_event);
            }
          }
          // For newer browser, let's use the promise based Blob.arrayBuffer() function
          if(blob.arrayBuffer)
          {
            // console.log(`using blob.arrayBuffer`);
            blob.arrayBuffer().then((buffer) => {
              passToGeometryLoaded(buffer);
            });
          }
          // For older browser, we can't use blob.arrayBuffer(), so we'll use FileReader.readAsArrayBuffer() instead
          else {
            // console.log(`using FileReader`);
            const reader = new FileReader();
            reader.onload = function onLoad(e) {
              passToGeometryLoaded(reader.result);
            };
            reader.readAsArrayBuffer(blob);
          }
        }
        else {
          // We don't support this file type, so just create a download link for files
          // or a "open in new window" link for http or https URLs
          // console.log("blob?type is: " + blob.type)
          // console.log("creating download link");
          // frame_html
          //   .style({
          //     "width": "200px",
          //     "height": "200px",
          //   });
          self._adjust_leader_line(frame_html);
          var download = frame_html
            .append("a")
            .attr("href", image_url)
            .attr("class", "download-link")
            .attr("download", "download")
            .text("Download " + image.uri)
            ;
        }
      }

      // Remove loading indicator image
      frame_html.select(".loading-image").remove();
      var footer = frame_html.select(".frame-footer");

      // Adjust leader line
      self._adjust_leader_line(frame_html);

      // Create a resize handle
      add_resize_handle(frame_html);

      // Create a pin button ...
      add_pin_button(footer);

      // Create a maximize button ...
      add_max_button(footer);

      // Create a maximize button ...
      add_min_button(footer);

      // Create a download button for non-links ...
      if(!link)
        add_download_button(footer, image_url, image.uri.split('/').pop());

      // Create jump control
      add_jump_button(footer, image.index);

      // Create clone button for 3D media ... 
      if(isVtp)
      {
        add_clone_button(footer, image.uri);
      }

      if(!image.no_sync)
        self._sync_open_media();

      self._open_images(images.slice(1), true);

      return;

    }

    // If we don't have a session for the image hostname, create one.
    var cached_uri = URI(api_root + "projects/" + self.options.model.project + "/cache/" + URI.encode(uri.host() + uri.path()))

    console.log("Attempting to load image from server-side cache...");
    console.log("Loading image " + image.uri + " from server...");

    var xhr = new XMLHttpRequest();
    var api = "/file";
    if(self.options.video_file_extensions.indexOf(uri.suffix()) > -1) {
      api = "/file";
    }

    xhr.image = image;
    xhr.open("GET", api_root + "projects/" + self.options.model.project + "/cache/" + URI.encode(uri.host() + uri.path()), true);
    xhr.responseType = "arraybuffer";

    xhr.onload = function(e){
      //If the image isn't in cache, open an agent session:
      if (this.status == 404) {
        if(!self.login_open)
        {
          self.login_open = true;
          self.remotes.get_remote({
            hostname: uri.hostname(),
            title: "Login to " + uri.hostname(),
            message: "Loading " + uri.pathname(),
            cancel: function() {
              var jFrame = $(".scaffolding." + image.image_class + "[data-uid=\"" + image.uid + "\"]");
              var frame = d3.select(jFrame[0]);
              var related_frames = jFrame
                .closest('.media-layer')
                .children('.scaffolding')
                .filter(function(_,x){ 
                  return URI($(x).attr("data-uri")).hostname() == uri.hostname(); 
                });
              related_frames.find(".loading-image").remove();

              var reload_button = d3
                .selectAll(related_frames.filter(":not(:has(>.reload-button))"))
                .append("span")
                .attr("class", "fa fa-refresh reload-button")
                .attr("title", "Could not load image. Click to reconnect.")
                .each(function(){
                  var parent = d3.select(this.parentNode);
                  d3.select(this).style({
                    top: (parseInt(parent.style("height"))/2 - 16) + "px",
                    left: (parseInt(parent.style("width"))/2 - 16) + "px",
                    cursor: "pointer"})})
                .on("click", (function(img, frame){
                  return function(){
                    var hostname = URI(img.uri).hostname();
                    var images = $(this)
                      .closest(".media-layer")
                      .children(".scaffolding")
                      .filter(function(_,x){ 
                        return URI($(x).attr("data-uri")).hostname() == hostname; 
                      })
                      ;
                    var loading_image = d3.selectAll(images)
                      .append("div")
                      .attr("class", "loading-image")
                      ;
                    images.find(".reload-button").remove();
                    self._open_images(images.map(function(_,x){ 
                      return {
                        uri: $(x).attr("data-uri"), 
                        uid: $(x).attr("data-uid"),
                        image_class: image.image_class
                      }; 
                      }));
                  }})(image, frame));
              self.login_open = false;
            },
            success: function(hostname) {
              var xhr = new XMLHttpRequest();
              var api = "/file";
              if(self.options.video_file_extensions.indexOf(uri.suffix()) > -1) {
                api = "/file";
              }

              xhr.image = image;
              //Double encode to avoid cherrypy's auto unencode in the controller
              xhr.open("GET", api_root + "remotes/" + hostname + api + uri.pathname() + "?cache=project&project=" + self.options.model.project + "&key=" + URI.encode(URI.encode(uri.host() + uri.path())), true);
              xhr.responseType = "arraybuffer";
              xhr.onload = function(e) {
                // If we get 404, the remote session no longer exists because it timed-out.
                // If we get 500, there was an internal error communicating to the remote host.
                // Either way, delete the cached session and create a new one.
                if(this.status == 404 || this.status == 500) {
                  self.remotes.delete_remote(uri.hostname());
                  self._open_images(images);
                  return;
                }
                // If we get 400, it means that the session is good and we're
                // communicating with the remote host, but something else went wrong
                // (probably file permissions issues).
                if(this.status == 400) {
                  var message = this.getResponseHeader("slycat-message");
                  var hint = this.getResponseHeader("slycat-hint");

                  if(message && hint) {
                    window.alert(message + "\n\n" + hint);
                  } else if(message) {
                    window.alert(message);
                  } else {
                    window.alert("Error loading image " + this.image.uri + ": " + this.statusText);
                  }

                  return;
                } else {
                  // We received the image, so put it in the cache and start-over.
                  var array_buffer_view = new Uint8Array(this.response);
                  var blob = new Blob([array_buffer_view], {type:this.getResponseHeader('content-type')});
                  self.options.image_cache[image.uri] = blob;
                  self._open_images(images, true);
                }
              }

              xhr.send();
              self.login_open = false;
            },
          })
        }
      } else {
        // We received the image, so put it in the cache and start-over.
        var array_buffer_view = new Uint8Array(this.response);
        var blob = new Blob([array_buffer_view], {type:this.getResponseHeader('content-type')});
        self.options.image_cache[image.uri] = blob;
        self._open_images(images, true);
      }
    }
    xhr.send();
  },

  _is_off_axes: function(index) {
    let self = this;
    const x_value = self.options.x[index];
    const y_value = self.options.y[index];

    // console.log(`x: ${x_value}, y: ${y_value}`);

    const off_x_axis = self.custom_axes_ranges.x.min > x_value || self.custom_axes_ranges.x.max < x_value;
    const off_y_axis = self.custom_axes_ranges.y.min > y_value || self.custom_axes_ranges.y.max < y_value;

    const off_axes = off_x_axis || off_y_axis;
    return off_axes;
  },

  _close_hidden_simulations: function() {
    var self = this;
    $(".media-layer div.image-frame")
      .filter(function(){
        const index = $(this).data("index");
        const filtered = $.inArray(index, self.options.filtered_indices) == -1;
        const off_axes = self._is_off_axes(index);
        return filtered || off_axes;
      })
      .each(function(){
        self._remove_image_and_leader_line(d3.select(this));
      });
  },

  _open_shown_simulations: function() {
    var self = this;
    var areOpen = [];

    $(".media-layer div.image-frame")
      .each(function(){
        areOpen.push($(this).data("index"));
      });

    var width = Number(self.svg.attr("width"));
    var height = Number(self.svg.attr("height"));
    var images = [];
    self.options.open_images.forEach(function(image, index)
    {
      // Making sure we have an index and uri before attempting to open an image
      if (
        image.index != null 
        && image.uri != undefined 
        && self.options.filtered_indices.indexOf(image.index) != -1 
        && areOpen.indexOf(image.index) == -1 
        && !self._is_off_axes(image.index)
      )
      {
        images.push({
          index : image.index,
          uri : image.uri.trim(),
          image_class : "open-image",
          x : width * image.relx,
          y : height * image.rely,
          width : image.width,
          height : image.height,
          target_x : self.x_scale_format(self.options.x[image.index]),
          target_y : self.y_scale_format(self.options.y[image.index]),
          });
      }
    });
    self._open_images(images);
  },

  close_all_simulations: function() {
    var self = this;
    $(".media-layer div.image-frame")
      .each(function(){
        self._remove_image_and_leader_line(d3.select(this));
      })
      ;
    self._sync_open_media();
  },

  _schedule_hover_canvas: function(e) {
    var self = this;
    self._cancel_hover_canvas();

    // Disable hovering whenever anything else is going on ...
    if(self.state != "")
      return;

    self.hover_timer_canvas = window.setTimeout( function(){ self._open_hover_canvas(e) }, self.options.hover_time );
  },

  _open_hover_canvas: function(e) {
    var self = this;

    // Disable hovering whenever anything else is going on ...
    if(self.state != "")
      return;

    var x = self._offsetX(e),
        y = self._offsetY(e),
        filtered_indices = self.options.filtered_indices,
        filtered_selection = self.options.filtered_selection,
        square_size = self.options.canvas_square_size,
        shift = (square_size / 2),
        selected_square_size = self.options.canvas_selected_square_size,
        selected_shift = (selected_square_size / 2),
        index;

    var selected_match = self._open_first_match(x, y, filtered_selection, selected_shift, selected_square_size);
    if(!selected_match)
      self._open_first_match(x, y, filtered_indices, shift, square_size);
  },

  _open_first_match: function(x, y, indices, shift, size) {
    var self = this,
        xvalues = self.options.x,
        yvalues = self.options.y;
    for(var i = indices.length-1; i > -1; i-- ) {
      let index = indices[i];

      // Disable hovering on points that are off axes
      if(self._is_off_axes(index))
      {
        // console.log(`_open_first_match _is_off_axes`);
        continue;
      }
      
      let x1 = Math.round( self.x_scale_format( xvalues[index] ) ) - shift;
      let y1 = Math.round( self.y_scale_format( yvalues[index] ) ) - shift;
      let x2 = x1 + size;
      let y2 = y1 + size;

      if(x >= x1 && x <= x2 && y >= y1 && y <= y2)
      {
        // Disable hovering when there is no uri
        if(self.options.images[index].trim() != "")
        {
          self._open_hover(index);
        }

        return true;
      }
    }
    return false;
  },

  _open_hover: function(image_index)
  {
    var self = this;

    self._close_hover();
    self.opening_image = image_index;

    var width = self.svg.attr("width");
    var height = self.svg.attr("height");
    var hover_width = Math.min(width, height) * 0.85;
    var hover_height = Math.min(width, height) * 0.85;

    self._open_images([{
      index : self.options.indices[image_index],
      uri : self.options.images[self.options.indices[image_index]].trim(),
      image_class : "hover-image",
      x : Math.min(self.x_scale_format(self.options.x[image_index]) + 10, width  - hover_width  - self.options.border - 10),
      y : Math.min(self.y_scale_format(self.options.y[image_index]) + 10, height - hover_height - self.options.border - 10),
      width : hover_width,
      height : hover_height,
      target_x : self.x_scale_format(self.options.x[image_index]),
      target_y : self.y_scale_format(self.options.y[image_index]),
      no_sync : true,
    }]);
  },

  _clear_hover_timer: function() {
    let self = this;
    if (self.close_hover_timer) {
      window.clearTimeout(self.close_hover_timer);
      return self.close_hover_timer = null;
    }
  },

  _cancel_hover_state: function(frame, image)
  {
    let self = this;
    if (frame.classed("hover-image")) {
      self.opening_image = null;
      self._clear_hover_timer();
      frame.classed("hover-image", false).classed("open-image", true);
      image.image_class = "open-image";
    }
  },

  _cancel_hover_canvas: function()
  {
    var self = this;

    if(self.hover_timer_canvas)
    {
      window.clearTimeout(self.hover_timer_canvas);
      self.hover_timer_canvas = null;
    }
  },

  _hover_timeout: function(image_index, time)
  {
    var self = this;
    var checkInterval = 50;
    var cutoff = 1000;

    if(time > cutoff)
    {
      self._close_hover();
      return;
    }
    else if(self._is_hovering(image_index))
    {
      self.close_hover_timer = window.setTimeout(function(){self._hover_timeout(image_index, 0);}, checkInterval);
    }
    else
    {
      self.close_hover_timer = window.setTimeout(function(){self._hover_timeout(image_index, time+checkInterval);}, checkInterval);
    }
  },

  _is_hovering: function(image_index)
  {
    var self = this;
    //var hoverEmpty = self.image_layer.selectAll(".hover-image[data-index='" + image_index + "']:hover").empty();
    var hoverEmpty = self.media_layer.selectAll(".hover-image[data-index='" + image_index + "']:hover").empty();

    // if(!hoverEmpty)
    // {
    //   return true;
    // }

    // self.image_layer.selectAll(".hover-image").each(function(){
    //   var data_uri = d3.select(this).attr("data-uri");
    //   var videoHoverEmpty = self.video_layer.selectAll("video[data-uri='" + data_uri + "']:hover").empty();
    //   if(!videoHoverEmpty)
    //   {
    //     hoverEmpty = videoHoverEmpty;
    //   }
    // });

    return !hoverEmpty;
  },

  _close_hover: function()
  {
    var self = this;

    self.opening_image = null;

    if(self.close_hover_timer)
    {
      window.clearTimeout(self.close_hover_timer);
      self.close_hover_timer = null;
    }

    // Cancel any pending hover ...
    self._cancel_hover_canvas();

    // Close any current hover images and associated videos ...
    self.media_layer.selectAll(".hover-image").each(function(){
      self._remove_image_and_leader_line(d3.select(this));
    });
  },

  _adjust_leader_line: function(frame_html)
  {
    const self = this;
    const frame = $(frame_html.node());
    const width = frame.outerWidth();
    const height = frame.outerHeight();
    const uid = frame_html.attr("data-uid");
    const x = Number(frame_html.attr("data-transx"));
    const y = Number(frame_html.attr("data-transy"));
    const x1 = x + (width / 2);
    const y1 = y + (height / 2);
    self.line_layer
      .select(`line[data-uid='${uid}']`)
      .attr("x1", x1)
      .attr("y1", y1)
      ;
    window.store.dispatch(setMediaSizePosition({
      uid: uid,
      width: width,
      height: height,
      x: x,
      y: y,
    }));
  },

  // Move the frame to the front. Do not run this on mousedown or mouseup, because it stops propagation
  // of click events (and possibly others) in Chrome and Safari.
  _move_frame_to_front: function(frame)
  {
    // console.log("_move_frame_to_front");
    var self = this;
    let frameNode = frame;
    frame = $(frame);
    if(!frame.hasClass("selected"))
    {
      // console.log('frame is currently not selected, so will select it now.');
      // Detaching and appending (or insertAfter() or probably any other method of moving an element in the DOM) an element on mousedown
      // breaks other event listeners in Chrome and Safari by stopping propagation. It's as if it calls stopImmediatePropagation()
      // but probably what it's doing is thinking that since the element moved, there's no mouseup or click event fired after mousedown.
      // I didn't test for mouseup, but tested moving an element on mousedown and following click events were never fired or propagated.
      // frame.insertAfter($("div.image-frame:last-child"));
      // frame.detach().appendTo(self.media_layer.node());
      // November 2017, Alex stopped using frame.detach().appendTo() because of the above documented issues. Instead I switched to
      // using z-index for a cleaner implementation that works better with event handlers.

      // Increment highest_z_index and assign it to the current frame
      self.options.highest_z_index++;
      frame.css("z-index", self.options.highest_z_index);

      $(".open-image").each(function() {
        $(this).removeClass("selected");
        // If this is a 3d vtp viewer, let it know it's been unselected
        if(this.querySelector('.vtp'))
        {
          this.querySelector('.vtp').dispatchEvent(vtkunselect_event);
        }
      });
      frame.addClass("selected");

      self.current_frame = Number(frame.data("index"));

      // Fire a custom selected event to let vtk viewers know it was selected
      if(frameNode.querySelector('.vtp'))
      {
        frameNode.querySelector('.vtp').dispatchEvent(vtkselect_event);
      }

      // Dispatch update to current frame to redux store
      window.store.dispatch(changeCurrentFrame({
        uri: frame.data("uri"), 
        uid: frame.data("uid"),
      }));

      self._sync_open_media();
    }
  },

  _remove_image_and_leader_line: function(frame_html)
  {
    var self = this;
    var uid = frame_html.attr("data-uid");
    var index = frame_html.attr("data-index");
    var line = self.line_layer.select("line[data-uid='" + uid + "']");

    // Let vtk viewer know it was closed
    if(frame_html.node().querySelector('.vtp'))
    {
      frame_html.node().querySelector('.vtp').dispatchEvent(vtkclose_event);
    }
    frame_html.remove();
    line.remove();
    // Remove this frame's index from current_frame if it was selected
    if(self.current_frame == index)
    {
      self.current_frame = null;
      // Dispatch update to current frame to redux store
      window.store.dispatch(changeCurrentFrame({}));
    }
  },

  _scale_width: function(ratio, target_width, target_height)
  {
    var target_ratio = target_width / target_height;
    if(ratio > target_ratio)
    {
      return target_width;
    }
    else
    {
      return ratio * target_height;
    }
  },

  _scale_height: function(ratio, target_width, target_height)
  {
    var target_ratio = target_width / target_height;
    if(ratio > target_ratio)
    {
      return target_width / ratio;
    }
    else
    {
      return target_height;
    }
  },

  _offsetX: function(e)
  {
    return e.pageX - e.currentTarget.getBoundingClientRect().left - $(document).scrollLeft();
  },

  _offsetY: function(e)
  {
    return e.pageY - e.currentTarget.getBoundingClientRect().top - $(document).scrollTop();
  },

  pin: function(simulations)
  {
    var self = this;

    // Set default image size
    var imageWidth = self.options.pinned_width;
    var imageHeight = self.options.pinned_height;

    // Override default size if Sync Size is enabled
    if(window.store.getState().sync_scaling)
    {
      // Check if there are any open media
      const firstOpenMedia = window.store.getState().open_media[0];
      if(firstOpenMedia)
      {
        // console.debug(`Overriding default media size to match sync`);
        imageWidth = imageHeight = firstOpenMedia.width;
      }
    }

    var images = [];
    simulations.forEach(function(image_index, loop_index)
    {
      // console.debug('opening images from pin handler');
      images.push({
        index : self.options.indices[image_index],
        uri : self.options.images[self.options.indices[image_index]].trim(),
        image_class : "open-image",
        x : self._getDefaultXPosition(image_index, imageWidth),
        y : self._getDefaultYPosition(image_index, imageHeight),
        width : imageWidth,
        height : imageHeight,
        target_x : self.x_scale_format(self.options.x[image_index]),
        target_y : self.y_scale_format(self.options.y[image_index]),
        });
    });
    self._open_images(images);
  },

  jump_to_start: function()
  {
    var self = this;
    if(self.options["video-sync"])
    {
      // Pause all videos
      $(".open-image video").each(function(index, video)
      {
        self.pausing_videos.push($(video.parentElement).data('index'));
        video.pause();
      });
      // Set sync time to 0
      self.options["video-sync-time"] = 0;

      // Update and bookmark
      self._schedule_update({update_video_sync_time:true,});

      self.element.trigger("video-sync-time", self.options["video-sync-time"]);
    }
    else
    {
      var video = $(".open-image[data-index='" + self.current_frame + "'] video").get(0);
      if(video != null)
      {
        self._set_single_video_time(video, 0);
      }
    }
  },

  jump_to_end: function()
  {
    var self = this;
    if(self.options["video-sync"])
    {
      var minLength = Infinity;
      // Pause all videos and log highest length
      $(".open-image video").each(function(index, video)
      {
        self.pausing_videos.push($(video.parentElement).data('index'));
        video.pause();
        minLength = Math.min(video.duration, minLength);
      });

      // Set sync time to max video length
      self.options["video-sync-time"] = minLength;

      // Update and bookmark
      self._schedule_update({update_video_sync_time:true,});

      self.element.trigger("video-sync-time", self.options["video-sync-time"]);
    }
    else
    {
      var video = $(".open-image[data-index='" + self.current_frame + "'] video").get(0);
      if(video != null)
      {
        self._set_single_video_time(video, video.duration - self.options.frameLength);
      }
    }
  },

  frame_back: function()
  {
    var self = this;
    if(self.options["video-sync"])
    {
      var videos = $(".open-image video");
      var firstVideo = videos.get(0);
      if(firstVideo != undefined)
      {
        self.options["video-sync-time"] = Math.max(firstVideo.currentTime - self.options.frameLength, 0);
        self.element.trigger("video-sync-time", self.options["video-sync-time"]);
      }

      // Pause all videos
      videos.each(function(index, video)
      {
        self.pausing_videos.push($(video.parentElement).data('index'));
        video.pause();
      });

      // Update and bookmark
      self._schedule_update({update_video_sync_time:true,});
    }
    else
    {
      var video = $(".open-image[data-index='" + self.current_frame + "'] video").get(0);
      if(video != null)
      {
        var time = Math.max(video.currentTime - self.options.frameLength, 0);
        self._set_single_video_time(video, time);
      }
    }
  },

  frame_forward: function()
  {
    var self = this;
    if(self.options["video-sync"])
    {
      var videos = $(".open-image video");
      var minLength = Infinity;
      var firstVideoDuration;

      // Pause all videos and log lowest length
      videos.each(function(index, video)
      {
        self.pausing_videos.push($(video.parentElement).data('index'));
        video.pause();
        minLength = Math.min(video.duration, minLength);
      });

      var firstVideo = videos.get(0);
      if(firstVideo != undefined)
      {
        self.options["video-sync-time"] = Math.min((firstVideo.currentTime + self.options.frameLength), (minLength - self.options.frameLength));
        // Update and bookmark
        self._schedule_update({update_video_sync_time:true,});
        self.element.trigger("video-sync-time", self.options["video-sync-time"]);
      }
    }
    else
    {
      var video = $(".open-image[data-index='" + self.current_frame + "'] video").get(0);
      if(video != null)
      {
        var time = Math.min(video.currentTime + self.options.frameLength, video.duration - self.options.frameLength);
        self._set_single_video_time(video, time);
      }
    }
  },

  play: function()
  {
    var self = this;
    if(self.options["video-sync"])
    {
      $(".open-image video").each(function(index, video)
      {
        self.playing_videos.push($(video.parentElement).data('index'));
        video.play();
      });
    }
    else
    {
      var video = $(".open-image[data-index='" + self.current_frame + "'] video").get(0);
      if(video != null)
      {
        self.playing_videos.push($(video.parentElement).data('index'));
        video.play();
      }
    }
  },

  pause: function()
  {
    var self = this;
    if(self.options["video-sync"])
    {
      var videos = $(".open-image video");
      var firstVideo = videos.get(0);
      if(firstVideo != undefined)
      {
        self.options["video-sync-time"] = firstVideo.currentTime;
        self.element.trigger("video-sync-time", self.options["video-sync-time"]);
      }

      videos.each(function(index, video)
      {
        self.pausing_videos.push($(video.parentElement).data('index'));
        video.pause();
      });

      self._schedule_update({update_video_sync_time:true,});
    }
    else
    {
      var video = $(".open-image[data-index='" + self.current_frame + "'] video").get(0);
      var videoIndex;
      if(video != null)
      {
        videoIndex = $(video.parentElement).data('index');
        self.pausing_videos.push(videoIndex);
        video.pause();
        self.options["video-sync-time"] = video.currentTime;
        self.syncing_videos.push(videoIndex);
        video.currentTime = self.options["video-sync-time"];
        self.element.trigger("video-sync-time", self.options["video-sync-time"]);
        self._sync_open_media();
      }
    }
  },

  _set_single_video_time: function(video, time)
  {
    var self = this;
    if(video != null)
    {
      self.pausing_videos.push($(video.parentElement).data('index'));
      video.pause();
      video.currentTime = time;
      self.options["video-sync-time"] = time;
      self.element.trigger("video-sync-time", self.options["video-sync-time"]);
      self._sync_open_media();
    }
  },

  x_scale_canvas_format: function(coordinate)
  {
    var self = this;
    return self.x_scale_canvas(self.format_for_scale(coordinate, self.options.x_axis_type));
  },

  y_scale_canvas_format: function(coordinate)
  {
    var self = this;
    return self.y_scale_canvas(self.format_for_scale(coordinate, self.options.y_axis_type));
  },

  x_scale_format: function(coordinate)
  {
    var self = this;
    return self.x_scale(self.format_for_scale(coordinate, self.options.x_axis_type));
  },

  y_scale_format: function(coordinate)
  {
    var self = this;
    return self.y_scale(self.format_for_scale(coordinate, self.options.y_axis_type));
  },

  format_for_scale: function(coordinate, scale_type)
  {
    return scale_type == 'Date & Time' ? new Date(coordinate.toString()) : coordinate;
  },
});