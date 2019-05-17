/*
Copyright 2013 National Technology & Engineering Solutions of Sandia, LLC (NTESS). 
Under the terms of Contract DE-NA0003525 with NTESS, the U.S. Government 
retains certain rights in this software.
*/
// This function contains code for displaying the scatter plot
// for movie-plex.  Code includes setup, and resizing the
// jQuery UI layout pane and buttons for selection/zoom and coloring.
//
// NOTE: This routine assume the coordinates returned by MDS always
// lie within a box [0,1]^2.
//
// S. Martin
// 4/27/2015
//

import client from "js/slycat-web-client";
import d3 from "d3";
import URI from "urijs";
import "jquery-ui";

$.widget("mp.scatterplot", {

    options:
    {
        xy_coords: null,
        table_data: null,
        max_points_animate: null,
        scatter_border: null,
        point_color: null,
        point_size: null,
        no_sel_color: null,
        outline_no_sel: null,
        color_scale: null,
        color_array: null,
        scatter_plot: null,
        pick_distance : 3,
        x : [],
        y : [],
        state: null,
        start_drag: null,
        end_drag: null,
        drag_threshold : 3,
        x_scale: null,
        y_scale: null,
        indices : [],
        selection: [],
        diagram_time: 0,
        frame: 0,
        video_sync_time: 0,
        color_var_index: [],
        current_video: null,
        null_color: null,
    },

    _create: function()
    {
        // Set frame option according to diagram_time option
        this.options.frame = Math.round(this.options.diagram_time * 25); // 1001 frames per video, 40 seconds per video, ~25 frames per second

        this.container = d3.select("#mp-mds-scatterplot");

        this.xy_coords = this.options.xy_coords;
        this.table_data = this.options.table_data;
        this.max_points_animate = this.options.max_points_animate;
        this.scatter_border = this.options.scatter_border;
        this.point_color = this.options.point_color;
        this.point_size = this.options.point_size;
        this.no_sel_color = this.options.no_sel_color;
        this.outline_no_sel = this.options.outline_no_sel;
        this.color_scale = this.options.color_scale;
        this.color_array = this.options.color_array;

         // d3 scales
        this.x_scale = d3.scale.linear()
            .domain([0 - this.scatter_border, 1 + this.scatter_border]);
        this.y_scale = d3.scale.linear()
            .domain([0 - this.scatter_border, 1 + this.scatter_border]);

        this.selection_layer = d3.select(this.element.get(0)).append("g").attr("class", "selection-layer");

        var self = this;

        // Remove any existing event handlers because we are about to assign them and we don't want to keep old one and have them fire too.
        self.element.parent().off();

        self.element.parent().mousedown(function(e)
        {
          e.preventDefault();
          var output = e;
          self.start_drag = [self._offsetX(e), self._offsetY(e)];
          var s_d = self.start_drag;
          self.end_drag = null;
          var s_e = self.start_drag;
        });

        self.element.parent().mousemove(function(e)
        {
          if(self.start_drag) // Mouse is down ...
          {
            if(self.end_drag) // Already dragging ...
            {
              self.end_drag = [self._offsetX(e), self._offsetY(e)];
              var output = e;
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

        self.element.parent().mouseup(function(e)
        {
          if(self.state == "resizing" || self.state == "moving") {
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

          //This is a test, frame # should be diagram_time * 25 because there are 25 frames per second in each video

          var test_count = self.options.xy_coords[self.options.frame].length;
          var one_set_xy_data = self.options.xy_coords[self.options.frame];

          if(self.state == "rubber-band-drag") // Rubber-band selection ...
          {
            // console.log("Rubberband selection.");
            self.selection_layer.selectAll(".rubberband").remove();

            if(self.start_drag && self.end_drag)
            {
              var x1 = Math.min(self.start_drag[0], self.end_drag[0]);
              // console.log("x1 ::: " + x1);
              var x2 = Math.max(self.start_drag[0], self.end_drag[0]);
              // console.log("x2 ::: " + x2);
              var y1 = Math.min(self.start_drag[1], self.end_drag[1]);
              // console.log("y1 ::: " + y1);
              var y2 = Math.max(self.start_drag[1], self.end_drag[1]);
              // console.log("y2 ::: " + y2);

              for(var i = 0; i != test_count; ++i)
              {
                  var one_point_xy_data = one_set_xy_data[i];
                  x_coord = self.x_scale(one_point_xy_data[0]);
                  // console.log("x_coord ::: " + x_coord);
                  y_coord = self.y_scale(one_point_xy_data[1]);
                  // console.log("y_coord ::: " + y_coord);
                // x_coord = self.x_scale(x[i]);
                // y_coord = self.y_scale(y[i]);
                if(x1 <= x_coord && x_coord <= x2 && y1 <= y_coord && y_coord <= y2)
                {
                  // var index = self.options.selection.indexOf(self.options.indices[i]);
                    var index = self.options.selection.indexOf(i);
                  if(index == -1)
                  {
                      self.options.selection.push(i);
                      self.element.trigger("scatterplot-selection-changed", [self.options.selection.slice()]); // Passing copy of self.options.highlighted_simulations to ensure that others don't make changes to it
                  }
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

            for(var i = test_count - 1; i > -1; i--)
            {
              var one_point_xy_data = one_set_xy_data[i];
              x_coord = self.x_scale(one_point_xy_data[0]);
              y_coord = self.y_scale(one_point_xy_data[1]);
              // x_coord = self.x_scale(x[i]);
              // y_coord = self.y_scale(y[i]);
              if(x1 <= x_coord && x_coord <= x2 && y1 <= y_coord && y_coord <= y2)
              {
                // Update the list of selected points ...
                var index = self.options.selection.indexOf(i);
                if(index == -1)
                {
                  // Selecting a new point.
                  self.options.selection.push(i);
                  self.element.trigger("scatterplot-selection-changed", [self.options.selection.slice()]); // Passing copy of self.options.highlighted_simulations to ensure that others don't make changes to it
                }
                else
                {
                  // Deselecting an existing point.
                  self.options.selection.splice(index, 1);
                  self.element.trigger("scatterplot-selection-changed", [self.options.selection.slice()]); // Passing copy of self.options.highlighted_simulations to ensure that others don't make changes to it
                }
                break;
              }

            }
          }

          self.start_drag = null;
          self.end_drag = null;
          self.state = "";

          // self._filterIndices();
          // self.options.selection = self.options.filtered_selection.slice(0);
          // self._schedule_update({render_selection:true});
          self.element.trigger("scatterplot-selection-changed", [self.options.selection]);
        });


        // color_scale = curr_color_scale;
        // color_array = curr_color_array;
        // table_data = TABLE_DATA;

        // set the maximum number of points to animate, maximum zoom factor
        // max_points_animate = MAX_POINTS_ANIMATE;

        // set scatter border size
        // this.scatter_border = this.options.scatter_border;

        // set the colors to use for selections
        // point_color = POINT_COLOR;
        // point_size = POINT_SIZE;
        // no_sel_color = NO_SEL_COLOR;

        // set selection width
        // outline_no_sel = OUTLINE_NO_SEL;

        // input data into model
        // xy_coords = xy_data;

        // init shift key detection
        d3.select("body").on("keydown.brush", this._key_flip)
                         .on("keyup.brush", this._key_flip);

        // svg scatter plot
        this.scatter_plot = d3.select("#mp-mds-scatterplot");

        this.draw();
    },

    // _update_color: function()
    // {
    //     this.color_scale = new_color_scale;
    //     this.color_array = new_color_array;
    //     module.draw();
    // },

    _key_flip: function()
    {
        // selections.key_flip(d3.event.shiftKey, d3.event.metaKey);
    },
    _offsetX: function(e)
    {
        return e.pageX - e.currentTarget.getBoundingClientRect().left - $(document).scrollLeft();
    },

    _offsetY: function(e)
    {
        return e.pageY - e.currentTarget.getBoundingClientRect().top - $(document).scrollTop();
    },

    draw: function()
    {
        var width = $("#mp-mds-pane").width();
        var height = $("#mp-mds-pane").height();

        // set correct viewing window
        this.x_scale.range([0,width]);
        this.y_scale.range([height,0]);

        // re-size scatter plot
        this.scatter_plot.attr("width", width)
            .attr("height", height);

        // draw the actual points
        this._draw_points();
    },

    _draw_points: function()
    {
        // console.log("In _draw_points");
        var self = this;
        // erase any old points
        this.scatter_plot.selectAll("circle").remove();

        // When drawing the points at the end, call this to move the selected points to the front
        d3.selection.prototype.moveToFront = function() {
          return this.each(function(){
            this.parentNode.appendChild(this);
          });
        };

        // console.log("inputting new points with frame");
        // console.log("Frame is: " + self.options.frame);
        //input new points
        var scatter_points = this.scatter_plot.selectAll("circle")
            .data(this.xy_coords[this.options.frame])
            .enter()
            .append("circle");

        // console.log("Success");
        // There is a scope issue with this.no_sel_color in an anonymous function
        var temp_no_sel_color = this.no_sel_color;

        // add index attribute
        scatter_points.attr("data-index", function(d,i){
          return i;
        });

        // make sure they are colored according to selections
        scatter_points.attr("stroke", function(d,i) {

            // default is point_color
            var outline_color = temp_no_sel_color;
            return outline_color;
        });

        // selections get thicker outline
        scatter_points.attr("stroke-width", function(d,i) {

            if(self.options.selection.indexOf(i) > -1) {
                var outline_width = 3;
                return outline_width;
            }
            // default stroke-width is 1
            var outline_width = self.outline_no_sel;
            return outline_width;
        });

        // fill in points

        var all_points = [];
        // Not sure how to do this the same way we are for the waveforms
        for (var i = 0; i < scatter_points[0].length; i++) {
            all_points.push(i);
        }

        var var_data = this.table_data[0].data[this.options.color_var_index];

        // console.log("Inside of draw_points()");
        // console.log("color_scale is:::::");
        // console.log(color_scale);

        // console.log("##### New color is :::::");

        // there's a scope issue with calling this.color_scale() inside of an anonymous function
        var temp_color_scale = this.color_scale;

        // fill in points
        if (all_points.length > 0 && this.color_scale != null) {
            scatter_points.attr("fill", function(d,i) {
                return temp_color_scale(var_data[all_points[i]]);
            });
        } else {
            scatter_points.attr("fill", this.point_color);
        }

        //scatter_points.attr("fill", point_color);

        // put in correct positions
        scatter_points.
        attr("cx", function(d) {
                return self.x_scale(d[0])
            })
        .attr("cy", function(d) {
                return self.y_scale(d[1])
            });

         scatter_points.attr("r", function(d,i) {
             if(self.options.selection.indexOf(i) > -1) {
                 var radius = 9;
                 //If selected, move the point to the front
                 d3.select(this).moveToFront();
                 return radius;
             }

             var radius = 5;
             return radius;
         });
    },

    _flash_point(value)
    {
      // console.log("flashing point " + value);
      var self = this;

      // Stop any currently flashing points
      clearTimeout(self.timeoutId);
      clearInterval(self.intervalId);

      var target = d3.select("svg#mp-mds-scatterplot circle[data-index='" + parseInt(value, 10) + "']");
      // How quickly to flash
      var interval = 200;
      // How long to flash for
      var timeout = 1200;
      var originalColor = target.attr("fill");
      var originalSize = target.attr("r");
      var flashColor = self.options.null_color;
      var flashSize = originalSize*2;

      // Remove target from DOM and append it at the end of all the points to bring it to the top
      self.scatter_plot.append(function(){
        return target.remove().node();
      });

      function toggleEffect()
      {
        // Set the effect for "flashed" state
        target.transition().duration(interval/2)
          // .attr("fill", flashColor)
          .attr("r", flashSize)
          ;

        // After 1/2 of flash interval, remove "flashed" effect
        setTimeout(function(){
          target.transition().duration(interval/2)
            // .attr("fill", originalColor)
            .attr("r", originalSize)
            ;
        }, interval/2);
      }

      // Start the first flash right away
      toggleEffect();
      // Continue flashing after length of interval
      self.intervalId = setInterval(toggleEffect, interval);
      // Stop flashing after timeout
      self.timeoutId = setTimeout(function(){
        clearInterval(self.intervalId);
      }, timeout);
    },

    _setOption: function(key, value)
    {
        if (key == "color-options")
        {
            // this.options[key] = value;
            this.options.color_scale = value.color_scale;
            this.options.color_array = value.color_array;
            this.options.null_color = value.null_color;

            this._create();
        }
        else if (key == "highlighted_simulations")
        {
            this.options[key] = value;
            this.options.selection = value;

            this.draw();
        }
        else if (key == "diagram_time")
        {
            this.options[key] = value;
            this.options.diagram_time = value;
            this.options.frame = Math.round(value * 25); // 1001 frames per video, 40 seconds per video, ~25 frames per second

            this.draw();
        }
        else if (key == "video_sync_time")
        {
            this.options[key] = value;
            this.options.video_sync_time = value;
        }
        else if (key == "color-var-options")
        {
            this.options[key] = value;
            this.options.color_var_index = value;

            this.draw();
        }
        else if (key == "current_video")
        {
          this.options[key] = value;
          if(value != undefined)
            this._flash_point(value);
        }
        else if (key == "null_color")
        {
          if(this.options[key] != value)
          {
            this.options[key] = value;
          }
        }
    },
});
