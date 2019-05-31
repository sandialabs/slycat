/*
Copyright 2013 National Technology & Engineering Solutions of Sandia, LLC (NTESS). 
Under the terms of Contract DE-NA0003525 with NTESS, the U.S. Government 
retains certain rights in this software.
*/
// This module contains code for displaying the trajectory plots in
// the movie-plex app.  The initial setup is performed by calling
// the .setup routine.
//
// S. Martin & Jaxon Gittinger
// 4/27/2017

import "./slycat-scrubber.js";
import api_root from "js/slycat-api-root";
import d3 from "d3";
import ko from "knockout";
import mapping from "knockout-mapping";
import knob from "jquery-knob";
import _ from "lodash";
import "jquery-ui";

$.widget("mp.trajectories",
{
  options:
  {
    api_root : "",
    waveforms : null, // Time & value data for all waveforms, not just the visible ones
    selection : null, // Array of ids of waveforms that are visible
    highlighted_simulations : [], // Array of ids of waveforms that are highlighted
    color_array : null,
    color_scale : null,
    foreground_color : ko.observable(null),
    hover_background_color : ko.observable(null),
    nullWaveformColor: "gray",
    nullWaveformDasharray: "5,5",
    hover : [],
    table_data : null,
    video_sync : false,
    video_sync_time : 0,
    min_time: null,
    max_time: null,
    diagram_time : null,
    color_var_index: [],
    current_video: null,
  },

  _create: function()
  {
    var self = this;

    this.waveforms = this.options.waveforms;
    this.container = d3.select("#waveform-viewer");
    this.width = $("#mp-trajectories").width();
    this.height = $("#mp-trajectories").height();
    this.padding_top = 45;
    this.padding_right = 20;
    this.padding_bottom = 40;
    this.padding_left = 20;
    this.diagram_width = ko.observable(this.width - this.padding_right - this.padding_left);
    this.diagram_height = ko.observable(this.height - this.padding_top - this.padding_bottom);

    this.thumb_width = ko.observable(8);
    this.thumb_height = ko.observable(13);
    this.scrubberWidth = ko.computed(function(){
      return self.diagram_width() + self.thumb_width();
    });
    this.scrubberHeight = ko.computed(function(){
      return self.diagram_height() + self.padding_top - 32;
    });
    this.scrubber_domain_min = ko.observable(self.options.min_time);
    this.scrubber_domain_max = ko.observable(self.options.max_time);
    this.scrubber_domain_value = ko.observable(self.options.diagram_time);

    this.scrubberContainer = $("#trajectories-scrubber");
    this.scrubberContainer.css({
      "margin-left": (this.padding_left - (this.thumb_width())) + "px",
      "margin-top": "20px",

    });

    this.waveformPieContainer = $("#waveform-progress");
    this.waveformPie = $("#waveform-progress .waveformPie")
    this.waveformPie.knob({
                  'min':0,
                  'readOnly':true,
                  'displayInput':false,
                  'fgColor':'#7767B0',
                  'bgColor':'#DBD9EB',
                  'width':200,
                  'height':200,
                  'thickness':0.35,
                  'step':1,
                });

    this.waveformSelectionPieContainer = $("#waveform-selection-progress");
    this.waveformSelectionPie = $("#waveform-selection-progress .waveformPie")
    this.waveformSelectionPie.knob({
                  'min':0,
                  'readOnly':true,
                  'displayInput':false,
                  'fgColor':'#7767B0',
                  'bgColor':'#DBD9EB',
                  'width':200,
                  'height':200,
                  'thickness':0.35,
                  'step':1,
                });

    this.waveformSelectorPieContainer = $("#waveform-selector-progress");
    this.waveformSelectorPie = $("#waveform-selector-progress .waveformPie")
    this.waveformSelectorPie.knob({
                  'min':0,
                  'readOnly':true,
                  'displayInput':false,
                  'fgColor':'#7767B0',
                  'bgColor':'#DBD9EB',
                  'width':15,
                  'height':15,
                  'thickness':0.50,
                  'step':1,
                });

    this.waveformProcessingTimeout = { timeoutID: null };
    this.waveformSelectionProcessingTimeout = { timeoutID: null };
    this.previewWaveformsTimeout = null;
    this.showWaveformPieContainerTimeout = null;
    this.showWaveformSelectionPieContainerTimeout = null;
    this.showWaveformSelectorPieContainerTimeout = null;
    this.color_array = this.options.color_array;
    this.color_scale = this.options.color_scale;

    this.container.selectAll("canvas").remove();

    this.x_axis_layer = this.container.append("g").attr("class", "x-axis");
    // this.y_axis_layer = this.container.append("g").attr("class", "y-axis");

    this.canvas_datum = d3.select(self.element.parent().get(0)).insert("canvas", ":first-child")
      .style({
        'position':'absolute',
        'left':this.padding_left + 'px',
        'top':this.padding_top + 'px'
      })
      .attr("id", "canvas_datum")
      .node()
      ;
    // alpha true or false doesn't seem to make any difference at 15k waveforms x 1000 samples
    this.canvas_datum_ctx = this.canvas_datum.getContext("2d", {alpha:true});

    this.canvas_selection = d3.select($("#waveform-selection-wrapper", self.element.parent()).get(0)).append("canvas")
      .style({
        'position':'absolute',
        'left':this.padding_left + 'px',
        'top':this.padding_top + 'px'
      })
      .attr("id", "canvas_selection")
      .node()
      ;
    this.canvas_selection_ctx = this.canvas_selection.getContext("2d", {alpha:true});

    this.canvas_animation = d3.select($("#waveform-selection-wrapper", self.element.parent()).get(0)).append("canvas")
      .style({
        'position':'absolute',
        'left':this.padding_left + 'px',
        'top':this.padding_top + 'px'
      })
      .attr("id", "canvas_animation")
      .node()
      ;
    this.canvas_animation_ctx = this.canvas_animation.getContext("2d", {alpha:true});

    this.canvas_hover = d3.select($("#waveform-selection-wrapper", self.element.parent()).get(0)).append("canvas")
      .style({
        'position':'absolute',
        'left':this.padding_left + 'px',
        'top':this.padding_top + 'px'
      })
      .attr("id", "canvas_hover")
      .node()
      ;
    this.canvas_hover_ctx = this.canvas_hover.getContext("2d", {alpha:true});

    this.canvas_offscreen = document.createElement('canvas');
    this.canvas_offscreen_ctx = this.canvas_offscreen.getContext('2d', {alpha:true});

    this.canvas_picker = document.createElement('canvas');
    this.canvas_picker_ctx = this.canvas_picker.getContext('2d', {alpha:true});

    function RGBtoInt(r, g, b)
    {
      return r<<16 | g<<8 | b;
    }

    function hover(event) {
      var x = event.layerX;
      var y = event.layerY;

      var pixelPick = self.canvas_picker_ctx.getImageData(x, y, 1, 1);
      var dataPick = pixelPick.data;
      var rgbaPick = 'rgba(' + dataPick[0] + ',' + dataPick[1] +
                 ',' + dataPick[2] + ',' + dataPick[3] + ')';

      var id, isPointInStrokePick, path;
      if(dataPick[3]==255)
      {
        id = RGBtoInt(dataPick[0], dataPick[1], dataPick[2]);
        // console.log('you are hovering over waveform with id ' + id);

        path = self.paths[id];

        isPointInStrokePick = self.canvas_picker_ctx.isPointInStroke(path, x, y);

        if(isPointInStrokePick)
        {
          self.options.hover = [id];
          self._hover();
        }
      }
      else
      {
        // Only clear hover if there is something hovered
        if(self.options.hover.length > 0)
        {
          self.options.hover = [];
          self._hover();
        }
      }

    }
    this.canvas_hover.addEventListener('mousemove', hover);

    function click(event) {
      // Add or remove waveform to highlights if ctrl clicked
      if(event.ctrlKey || event.metaKey)
      {
        var index = self.options.highlighted_simulations.indexOf(self.options.hover[0]);
        if(index < 0)
        {
          self.options.highlighted_simulations.push(self.options.hover[0])
        }
        else
        {
          self.options.highlighted_simulations.splice(index, 1);
          // Clear hover effect to provide feedback that waveform was removed from highlight
          self.options.hover = [];
          self._hover();
        }
      }
      // Select only clicked waveform
      else
      {
        self.options.highlighted_simulations = self.options.hover.slice();
      }
      self._selection();
      self.element.trigger("waveform-selection-changed", [self.options.highlighted_simulations.slice()]); // Passing copy of self.options.highlighted_simulations to ensure that others don't make changes to it
      event.stopPropagation();
    }
    this.canvas_hover.addEventListener('click', click);

    // Set all waveforms to visible if this options has not been set
    var visible = this.options.selection;
    if(visible === null) {
      visible = [];
      for(var i=0; i<this.waveforms.length; i++) {
        visible.push(this.waveforms[i]["input-index"]);
      }
      this.options.selection = visible;
    }

    this._set_visible();
    this._selection();
    ko.applyBindings({
        length: this.scrubberWidth,
        height: this.scrubberHeight,
        color: self.options.foreground_color,
        hover_background_color: self.options.hover_background_color,
        thumb_width: this.thumb_width,
        thumb_height: this.thumb_height,
        domain_min:   this.scrubber_domain_min,
        domain_max:   this.scrubber_domain_max,
        domain_value: this.scrubber_domain_value,
      }, document.getElementById("mp-trajectories"));
  },

  // Calculate paths
  _calculate_paths: function()
  {
    var self = this;
    var x_min = d3.min(this.waveforms, function(waveform) { return d3.min(waveform["time"]); });
    var x_max = d3.max(this.waveforms, function(waveform) { return d3.max(waveform["time"]); });
    var y_min = d3.min(this.waveforms, function(waveform) { return d3.min(waveform["value"]); });
    var y_max = d3.max(this.waveforms, function(waveform) { return d3.max(waveform["value"]); });

    this.x = d3.scale.linear()
      .domain([x_min, x_max])
      .range([0, this.diagram_width()])
      ;

    this.y = d3.scale.linear()
      .domain([y_max, y_min])
      .range([0, this.diagram_height()])
      ;

    this.paths = [];
    var waveform, current_waveform_length, p;
    for(var j = 0; j < this.waveforms.length; j++)
    {
      p = new Path2D();
      waveform = this.waveforms[j];
      current_waveform_length = waveform["time"].length;

      for(var i = 0; i != current_waveform_length; ++i)
      {
        p.moveTo( self.x(waveform["time"][i]), self.y(waveform["value"][i]) );
        break;
      }
      for(var i = 1; i < current_waveform_length; ++i)
      {
        p.lineTo( self.x(waveform["time"][i]), self.y(waveform["value"][i]) );
      }

      this.paths[waveform["input-index"]] = p;
    }
  },

  // Renders waveforms
  _set_visible: function()
  {
    var self = this;
    var visible = this.options.selection;
    this.waveforms = this.options.waveforms;

    // Cancel any previously started work
    self._stopProcessingWaveforms();

    var x_min = d3.min(this.waveforms, function(waveform) { return d3.min(waveform["time"]); });
    var x_max = d3.max(this.waveforms, function(waveform) { return d3.max(waveform["time"]); });
    var y_min = d3.min(this.waveforms, function(waveform) { return d3.min(waveform["value"]); });
    var y_max = d3.max(this.waveforms, function(waveform) { return d3.max(waveform["value"]); });

    this.x = d3.scale.linear()
      .domain([x_min, x_max])
      .range([0, this.diagram_width()])
      ;

    this.y = d3.scale.linear()
      .domain([y_max, y_min])
      .range([0, this.diagram_height()])
      ;

    this.x_axis = d3.svg.axis().scale(this.x).orient("bottom");
    this.x_axis_layer
        .attr("transform", "translate(" + (this.padding_left - 1) + "," + (this.padding_top + this.diagram_height() + 1) + ")")
        .call(this.x_axis)
        ;

    // this.y_axis = d3.svg.axis().scale(this.y).orient("left");
    // this.y_axis_layer
    //     .attr("transform", "translate(" + (this.padding_left - 1) + "," + (this.padding_top + 1) + ")")
    //     .call(this.y_axis)
    //     ;

    d3.selectAll("canvas")
      .attr("width", this.diagram_width())
      .attr("height", this.diagram_height())
      ;

    this.canvas_offscreen.width = this.diagram_width();
    this.canvas_offscreen.height = this.diagram_height();

    this.canvas_picker.width = this.diagram_width();
    this.canvas_picker.height = this.diagram_height();

    var fillStyle = $("#color-switcher").colorswitcher("get_background");
    var opacity = $("#color-switcher").colorswitcher("get_opacity");

    this.canvas_hover_ctx.fillStyle      = "rgba(" + fillStyle.r + ", " + fillStyle.g + ", " + fillStyle.b + ", " + opacity + ")";
    this.canvas_selection_ctx.fillStyle  = "rgba(" + fillStyle.r + ", " + fillStyle.g + ", " + fillStyle.b + ", " + opacity + ")";
    this.canvas_animation_ctx.fillStyle  = "rgba(" + fillStyle.r + ", " + fillStyle.g + ", " + fillStyle.b + ", " + opacity + ")";

    var waveform_subset = [];
    if(visible !== undefined) {
      for(var i=0; i<visible.length; i++)
      {
        waveform_subset.push(self.waveforms[visible[i]])
      }
    }
    else {
      waveform_subset = self.waveforms;
    }

    this.canvas_offscreen_ctx.lineWidth = 1;
    this.canvas_picker_ctx.lineWidth = 3;
    this.canvas_hover_ctx.lineWidth = 3;
    this.canvas_selection_ctx.lineWidth = 3;
    this.canvas_animation_ctx.lineWidth = 1;

    var result, current_waveform, p, strokeStyle;

    // console.log("self.options.color_scale is " + self.options.color_scale);
    // console.log("self.options.color_array is + " + self.options.color_array);

    this.waveformsLength = waveform_subset.length;
    if(this.waveformsLength > 0){
      self.waveformPie.trigger(
        'configure',
        {
          "max":this.waveformsLength,
        }
      );
      self.waveformSelectorPie.trigger(
        'configure',
        {
          "max":this.waveformsLength,
        }
      );

      // Don't want the progress indicator showing up every time. Only if the delay is longer than 1 second.
      self.showWaveformPieContainerTimeout = setTimeout(function(){
        self.waveformPieContainer.show(0);
      }, 1000);

      this._calculate_paths();

      self._timedProcessArray(
        waveform_subset,
        processWaveform,
        finishedProcessingWaveforms,
        self.waveformPie,
        self.waveformProcessingTimeout
      );
      previewWaveforms(self.canvas_offscreen, self.canvas_datum_ctx);
    }

    function processWaveform(waveform){
      self._strokeLine(waveform["input-index"], self.canvas_offscreen_ctx);
    }

    function processWaveformLookup(waveform){
      self.canvas_picker_ctx.strokeStyle = self.intToRGB(waveform["input-index"]);
      self.canvas_picker_ctx.stroke(self.paths[waveform["input-index"]]);
      // console.log('just stroked lookup: ' + waveform["input-index"]);
    }

    function finishedProcessingWaveformsLookup(){
      clearTimeout(self.showWaveformSelectorPieContainerTimeout);
      self.waveformSelectorPieContainer.hide();

      // If we have a current_video, re-draw its line on top of the datum, selection, and picker canvases
      if(self.options.current_video != null)
      {
        // console.log("we have a current_video, so will re-draw it to bring it to the top: " + self.options.current_video);
        self._bring_to_top(self.options.current_video);
      }
    }

    function finishedProcessingWaveforms(){
      // Cancelling the timeout that was set to delay progress indicator display
      clearTimeout(self.showWaveformPieContainerTimeout);
      self.waveformPieContainer.hide();
      clearTimeout(self.previewWaveformsTimeout);
      self.previewWaveformsTimeout = undefined;
      self.canvas_datum_ctx.drawImage(self.canvas_offscreen, 0, 0);

      // Don't want the progress indicator showing up every time. Only if the delay is longer than 1 second.
      self.showWaveformSelectorPieContainerTimeout = setTimeout(function(){
        self.waveformSelectorPieContainer.show(0);
      }, 1000);

      self._timedProcessArray(
        waveform_subset,
        processWaveformLookup,
        finishedProcessingWaveformsLookup,
        self.waveformSelectorPie,
        self.waveformProcessingTimeout
      );
    }

    function previewWaveforms(sourceCanvas, destinationContext, timeout){
      if (timeout == null)
        timeout = 500

      self.previewWaveformsTimeout = setTimeout( function(){
        destinationContext.drawImage(sourceCanvas, 0, 0);
        if(self.previewWaveformsTimeout)
        {
          self.previewWaveformsTimeout = setTimeout(arguments.callee, timeout);
        }
      }, timeout );
    }
  },

  intToRGB: function(int)
  {
    var r = (int >> 16) & 0xff;
    var g = (int >> 8) & 0xff;
    var b = int & 0xff;
    return d3.rgb(r, g, b);
  },

  /* Hover effect for waveforms */
  _hover: function(waveforms)
  {
    var self = this;
    var fillStyle;

    // Only hover a waveform if it's part of the current selection
    var selection = self.options.selection;
    var hover = self.options.hover;
    var inCurrentSelection = [];
    for(var i=0; i<hover.length; i++){
      if( selection.indexOf(hover[i]) > -1 ){
        inCurrentSelection.push(hover[i]);
      }
    }
    hover = inCurrentSelection;

    var waveform_subset = [];
    for(var i=0; i<hover.length; i++)
    {
      var node_index = hover[i];
      if(node_index < self.waveforms.length)
        waveform_subset.push(self.waveforms[node_index]);
    }

    // Clear the canvas
    self.canvas_hover_ctx.clearRect(0, 0, self.canvas_hover.width, self.canvas_hover.height);
    // Apply semi transparent background if we are displaying any waveforms
    if(waveform_subset.length > 0)
    {
      self.canvas_hover_ctx.fillRect(0, 0, self.canvas_hover.width, self.canvas_hover.height);
    }

    var input_index, strokeStyle, coloredLine;
    for(var i = 0; i < waveform_subset.length; i++)
    {
      self._strokeLine(waveform_subset[i]["input-index"], self.canvas_hover_ctx);
    }
  },

  /* Highlights waveforms */
  _selection: function(waveforms)
  {
    var self = this;

    // Cancel any previously started work
    self._stopProcessingWaveformsSelection();

    // Only highlight a waveform if it's part of the current selection
    var selection = self.options.selection;
    var highlighted_simulations = self.options.highlighted_simulations;
    var inCurrentSelection = [];
    for(var i=0; i<highlighted_simulations.length; i++){
      if( selection.indexOf(highlighted_simulations[i]) > -1 ){
        inCurrentSelection.push(highlighted_simulations[i]);
      }
    }
    highlighted_simulations = inCurrentSelection;

    var waveform_subset = [];
    for(var i=0; i<highlighted_simulations.length; i++)
    {
      var node_index = highlighted_simulations[i];
      if(node_index < self.waveforms.length)
        waveform_subset.push(self.waveforms[node_index]);
    }

    // Clear the canvas
    self.canvas_selection_ctx.clearRect(0, 0, self.canvas_selection.width, self.canvas_selection.height);
    // If we are displaying any waveforms...
    if(waveform_subset.length > 0)
    {
      // Apply semi transparent background if we are displaying any waveforms
      self.canvas_selection_ctx.fillRect(0, 0, self.canvas_hover.width, self.canvas_hover.height);
      // Configure progress indicator max value
      self.waveformSelectionPie.trigger(
        'configure',
        {
          "max":waveform_subset.length,
        }
      );

      // Don't want the progress indicator showing up every time. Only if the delay is longer than 1 second.
      self.showWaveformSelectionPieContainerTimeout = setTimeout(function(){
        self.waveformSelectionPieContainer.show(0);
      }, 1000);

      self._timedProcessArray(
        waveform_subset,
        processWaveformSelection,
        finishedProcessingWaveformsSelection,
        self.waveformSelectionPie,
        self.waveformSelectionProcessingTimeout
      );
      //previewWaveforms(self.canvas_offscreen, self.canvas_datum_ctx);
    }

    function processWaveformSelection(waveform){
      self._strokeLine(waveform["input-index"], self.canvas_selection_ctx);
    }

    function finishedProcessingWaveformsSelection(){
      // Cancelling the timeout that was set to delay progress indicator display
      clearTimeout(self.showWaveformSelectionPieContainerTimeout);
      self.waveformSelectionPieContainer.hide();

      // Commenting out intially to see if we can get away without previewing
      // clearTimeout(self.previewWaveformsSelectionTimeout);
      // self.previewSelectionWaveformsTimeout = undefined;
      // self.canvas_datum_ctx.drawImage(self.canvas_offscreen, 0, 0);
    }
  },

  _stopProcessingWaveforms: function()
  {
    var self = this;
    // Cancel any previously started work
    clearTimeout(self.waveformProcessingTimeout.timeoutID);
    clearTimeout(self.previewWaveformsTimeout);
    self.previewWaveformsTimeout = undefined;
    clearTimeout(self.showWaveformPieContainerTimeout);
    self.waveformPieContainer.hide();
  },

  _stopProcessingWaveformsSelection: function()
  {
    var self = this;
    // Cancel any previously started work
    clearTimeout(self.waveformSelectionProcessingTimeout.timeoutID);
    // Commenting out intially to see if we can get away without previewing
    // clearTimeout(self.previewWaveformsSelectionTimeout);
    // self.previewWaveformsSelectionTimeout = undefined;
    clearTimeout(self.showWaveformSelectionPieContainerTimeout);
    self.waveformSelectionPieContainer.hide();
  },

  _timedProcessArray: function(items, process, callback, progressControl, windowTimer)
  {
    var self = this;
    var timeout = 100; //how long to yield control to UI thread
    var todo = items.concat(); //create a clone of the original
    var calleeFunction =  function(){
      var start = +new Date();
      do {
        process(todo.shift());
      } while (todo.length > 0 && (+new Date() - start < 50));

      if (todo.length > 0){
        windowTimer.timeoutID = setTimeout(calleeFunction(), timeout);
      } else {
        callback(items);
      }

      progressControl.val(items.length - todo.length).trigger('change');
    };
    windowTimer.timeoutID = setTimeout(calleeFunction , timeout);
  },

  resize_canvas: function()
  {
    this.width = $("#mp-trajectories").width();
    this.height = $("#mp-trajectories").height();
    this.diagram_width(this.width - this.padding_left - this.padding_right);
    this.diagram_height(this.height - this.padding_top - this.padding_bottom);
    this._set_visible();
    this._selection();
  },

  _strokeLine: function(waveform_index, canvas_context, lineWidth)
  {
    var self = this;
    var color_scale_and_color_array = self.options.color_scale != null && self.options.color_array != null;
    var coloredLine = color_scale_and_color_array && self.options.color_array[ waveform_index ] !== null;
    if(coloredLine)
    {
        var var_data = self.options.table_data[0].data[self.options.color_var_index];
        var strokeStyle = self.options.color_scale(var_data[waveform_index]);
    }
    else
    {
      strokeStyle = $("#color-switcher").colorswitcher("get_null_color");
      canvas_context.setLineDash([8, 4]);
    }

    canvas_context.strokeStyle = strokeStyle;
    if(lineWidth != undefined)
    {
      canvas_context.lineWidth = lineWidth;
    }

    canvas_context.stroke(self.paths[waveform_index]);

    if(!coloredLine)
    {
      canvas_context.setLineDash([]);
    }
  },

  _bring_to_top: function(value)
  {
    var self = this;

    // Move the line to the top of the datum (i.e., visible) canvas by re-drawing it
    self._strokeLine(value, self.canvas_datum_ctx);

    // Move the line to the top of the picker canvas by re-drawing it
    self.canvas_picker_ctx.strokeStyle = self.intToRGB(value);
    self.canvas_picker_ctx.stroke(self.paths[value]);

    // If the line is highlighted, move it to the top of the highlight canvas by redrawing it
    if(self.options.highlighted_simulations.indexOf(value) > -1)
    {
      self._strokeLine(value, self.canvas_selection_ctx);
    }
  },

  _flash_line: function(value)
  {
    var self = this;
    var duration = 2000;
    var fadeOut = 200;
    var fadeIn = 400;

    var fillStyle = $("#color-switcher").colorswitcher("get_background");
    // var opacity = $("#color-switcher").colorswitcher("get_opacity");
    var opacity = 1;
    var lineWidth = 1;

    var targetContext = self.canvas_animation_ctx;

    targetContext.fillStyle = "rgba(" + fillStyle.r + ", " + fillStyle.g + ", " + fillStyle.b + ", " + opacity + ")";

    // Move line to top of canvases
    self._bring_to_top(value);

    // If the line is highlighted, draw it bold
    if(self.options.highlighted_simulations.indexOf(value) > -1)
    {
      lineWidth = 3;
    }

    function toggleEffect(timestamp)
    {
      if (!start) start = timestamp;
      var progress = timestamp - start;
      // console.log("progress is " + progress);

      // Clear the canvas
      targetContext.clearRect(0, 0, targetContext.canvas.width, targetContext.canvas.height);

      if(progress < 2000)
      {
        // Calculate opacity of background for various portions of transition

        // Fade out
        if(progress < fadeOut)
        {
          // console.log("fadeIn to: " + progress / fadeIn);
          targetContext.globalAlpha = progress / fadeOut;
        }
        // Fade in
        else if(progress > (duration - fadeIn))
        {
          // console.log("fadeOut to: " + (progress - (duration - fadeOut)) / fadeOut);
          targetContext.globalAlpha = 1 - ((progress - (duration - fadeIn)) / fadeIn);
        }
        // Full effect
        else
        {
          // console.log("duration to: " + 1);
          targetContext.globalAlpha = 1;
        }

        // Apply opacity calculate above to background
        targetContext.fillRect(0, 0, targetContext.canvas.width, targetContext.canvas.height);

        // Reset global alpha so line is drawn with full opacity
        targetContext.globalAlpha = 1;
        self._strokeLine(value, targetContext, lineWidth);
        window.requestAnimationFrame(toggleEffect);
      }
      else
      {
        // Clear the canvas
        targetContext.clearRect(0, 0, targetContext.canvas.width, targetContext.canvas.height);
      }
    }

    var start = null;
    window.requestAnimationFrame(toggleEffect);
  },

  _setOption: function(key, value)
  {
    if(key == "selection")
    {
      this.options[key] = value;
      this._set_visible();
    }
    else if(key == "highlighted_simulations")
    {
      if(!_.isEmpty(_.xor(this.options[key], value)))
      {
        this.options[key] = value.slice();
        this._selection();
      }
    }
    else if(key == "color-options")
    {
      this.options[key] = value;
      this.options.color_array = value.color_array;
      this.options.color_scale = value.color_scale;
      this.options.foreground_color(value.foreground_color);
      this.options.hover_background_color(value.hover_background_color);

      this._set_visible();
      this._selection();
    }
    else if(key == "color_scale")
    {
      this.options[key] = value;
      this._set_visible();
      this._selection();
    }
    else if(key == "waveforms")
    {
      this.options[key] = value;
      this.container.selectAll("g.waveform").remove();
      this.container.selectAll("g.selection").remove();
      this.container.selectAll("rect.selectionMask").remove();

      this.options.waveforms = value.waveforms;
      // Setting selection to all if it's undefined
      if(value.selection === null) {
        visible = [];
        for(var i=0; i<this.options.waveforms.length; i++) {
          visible.push(this.options.waveforms[i]["input-index"]);
        }
        this.options.selection = visible;
      } else {
        this.options.selection = value.selection;
      }

      // Only setting new highlight if one was passed in. Otherwise, leaving the existing one, just like the table does.
      if(value.highlighted_simulations !== undefined)
        this.options.highlighted_simulations = value.highlighted_simulations;

      this._set_visible();
      this._selection();
    }
    else if(key == "foreground_color")
    {
      this.options[key](value);
    }
    else if(key == "hover_background_color")
    {
      this.options[key](value);
    }
    else if(key == "diagram_time")
    {
      if(this.options[key] != value)
      {
        this.options[key] = value;
        this.scrubber_domain_value( Math.max(this.options.min_time, Math.min(value, this.options.max_time)) );
      }
    }
    else if(key == "color-var-options")
    {
      this.options[key] = value;
      this.options.color_var_index = value;
    }
    else if (key == "current_video")
    {
      this.options[key] = value;
      if(value != undefined)
        this._flash_line(value);
    }
  },
});
