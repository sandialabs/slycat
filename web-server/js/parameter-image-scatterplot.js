/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

//////////////////////////////////////////////////////////////////////////////////
// d3js.org scatterplot visualization, for use with the parameter-image model.


$.widget("parameter_image.scatterplot",
{
  options:
  {
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
    images : [],
    selection : [],
    colorscale : d3.scale.linear().domain([-1, 0, 1]).range(["blue", "white", "red"]),
    border : 25,
    server_root : "",
    open_images : [],
    gradient : null,
    hidden_simulations : [],
    filtered_indices : [],
    filtered_selection : [],
  },

  _create: function()
  {
    var self = this;

    self.hover_timer = null;
    self.close_hover_timer = null;

    self.opening_image = null;
    self.state = "";
    self.start_drag = null;
    self.current_drag = null;
    self.end_drag = null;

    // Setup the login dialog ...
    self.login = $("<div title='Remote Login'><p id='remote-error'><p id='remote-hostname'><form><fieldset><label for='remote-username'>Username</label><input id='remote-username' type='text'/><label for='remote-password'>Password</label><input id='remote-password' type='password'/></fieldset></form></p></div>");
    self.login.appendTo(self.element);
    self.login.dialog(
    {
      autoOpen: false,
      width: 700,
      height: 300,
      modal: true,
      close: function()
      {
        $("#remote-password").val("");
      }
    });

    // Setup the scatterplot ...
    self.svg = d3.select(self.element.get(0)).append("svg");
    self.x_axis_layer = self.svg.append("g").attr("class", "x-axis");
    self.y_axis_layer = self.svg.append("g").attr("class", "y-axis");
    self.legend_layer = self.svg.append("g").attr("class", "legend");
    self.legend_axis_layer = self.legend_layer.append("g").attr("class", "legend-axis");
    self.datum_layer = self.svg.append("g").attr("class", "datum-layer");
    self.selected_layer = self.svg.append("g");
    self.selection_layer = self.svg.append("g");
    self.image_layer = self.svg.append("g");

    self.session_cache = {};
    self.image_cache = {};

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

    self.legend_layer
      .call(
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
            // self._sync_open_images();
            d3.select(this).attr("data-status", "moved");
          })
      )
      ;

    self.element.mousedown(function(e)
    {
      //console.log("#scatterplot mousedown");
      self.start_drag = [e.originalEvent.layerX, e.originalEvent.layerY];
      self.end_drag = null;
    });

    self.element.mousemove(function(e)
    {
      //console.log("#scatterplot mousemove");
      if(self.start_drag) // Mouse is down ...
      {
        if(self.end_drag) // Already dragging ...
        {
          self.end_drag = [e.originalEvent.layerX, e.originalEvent.layerY];

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
          if(Math.abs(e.originalEvent.layerX - self.start_drag[0]) > self.options.drag_threshold || Math.abs(e.originalEvent.layerY - self.start_drag[1]) > self.options.drag_threshold) // Start dragging ...
          {
            self.state = "rubber-band-drag";
            self.end_drag = [e.originalEvent.layerX, e.originalEvent.layerY];
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

    self.element.mouseup(function(e)
    {
      if(self.state == "resizing" || self.state == "moving")
        return;

      //console.log("#scatterplot mouseup");
      if(!e.ctrlKey)
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
            x_coord = self.x_scale(x[i]);
            y_coord = self.y_scale(y[i]);
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
        var x1 = e.originalEvent.layerX - self.options.pick_distance;
        var x2 = e.originalEvent.layerX + self.options.pick_distance;
        var y1 = e.originalEvent.layerY - self.options.pick_distance;
        var y2 = e.originalEvent.layerY + self.options.pick_distance;

        for(var i = 0; i != count; ++i)
        {
          x_coord = self.x_scale(x[i]);
          y_coord = self.y_scale(y[i]);
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
  },

  _filterIndices: function()
  {
    var self = this;
    var x = self.options.x;
    var y = self.options.y;
    var indices = self.options.indices;
    var selection = self.options.selection;
    var hidden_simulations = self.options.hidden_simulations;

    var filtered_indices;
    if(indices.length > 1)
      filtered_indices = Array.apply( [], indices );
    else
      filtered_indices = [indices[0]];

    var filtered_selection = selection.slice(0);
    var length = indices.length;

    // Remove hidden simulations and NaNs and empty strings
    for(var i=length-1; i>=0; i--){
      var hidden = $.inArray(indices[i], hidden_simulations) > -1;

      if(hidden || !self._validateValue(x[i]) || !self._validateValue(y[i])) {
        filtered_indices.splice(i, 1);
        var selectionIndex = $.inArray(indices[i], filtered_selection);
        if( selectionIndex > -1 ) {
          filtered_selection.splice(selectionIndex, 1);
        }
      }
    }

    self.options.filtered_indices = filtered_indices;
    self.options.filtered_selection = filtered_selection;
  },

  _validateValue: function(value)
  {
    var self = this;
    if(typeof value == "number" && !isNaN(value))
      return true;
    if(typeof value == "string" && value.trim() != "")
      return true;
    return false;
  },

  _setOption: function(key, value)
  {
    var self = this;

    //console.log("parameter_image.scatterplot._setOption()", key, value);
    self.options[key] = value;

    if(key == "indices")
    {
      self._filterIndices();
      self._schedule_update({update_indices:true, render_selection:true});
    }

    else if(key == "x_label")
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
      self._filterIndices();
      self._close_hidden_simulations();
      self._schedule_update({update_x:true, update_leaders:true, render_data:true, render_selection:true});
    }

    else if(key == "y")
    {
      self._filterIndices();
      self._close_hidden_simulations();
      self._schedule_update({update_y:true, update_leaders:true, render_data:true, render_selection:true});
    }

    else if(key == "v")
    {
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
      self._schedule_update({update_width:true, update_x_label:true, update_x:true, update_leaders:true, render_data:true, render_selection:true});
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
      self._filterIndices();
      self._schedule_update({render_data:true, render_selection:true, });
      self._close_hidden_simulations();
    }
  },

  update_color_scale_and_v: function(data)
  {
    var self = this;
    self.options.colorscale = data.colorscale;
    self.options.v = data.v;
    if(data.v_string !== undefined)
    {
      self.options.v_string = data.v_string;
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

    if(self.updates["update_width"])
    {
      self.element.attr("width", self.options.width);
      self.svg.attr("width", self.options.width);
    }

    if(self.updates["update_height"])
    {
      self.element.attr("height", self.options.height);
      self.svg.attr("height", self.options.height);
    }

    if(self.updates["update_indices"])
    {
      self.inverse_indices = {};
      var count = self.options.indices.length;
      for(var i = 0; i != count; ++i)
        self.inverse_indices[self.options.indices[i]] = i;
    }

    if(self.updates["update_x"])
    {
      var total_width = self.element.attr("width");
      var total_height = self.element.attr("height");
      var width = Math.min(self.element.attr("width"), self.element.attr("height"));
      var height = Math.min(self.element.attr("width"), self.element.attr("height"));
      var width_offset = (total_width - width) / 2;
      var height_offset = (total_height - height) / 2;
      var range = [0 + width_offset + self.options.border, total_width - width_offset - self.options.border];

      if(!self.options.x_string)
      {
        self.x_scale = d3.scale.linear()
          .domain([d3.min(self.options.x), d3.max(self.options.x)])
          .range(range)
          ;
      }
      else
      {
        var uniqueValues = d3.set(self.options.x).values().sort();
        self.x_scale = d3.scale.ordinal()
          .domain(uniqueValues)
          .rangePoints(range)
          ;
      }
      
      self.x_axis = d3.svg.axis().scale(self.x_scale).orient("bottom");
      self.x_axis_layer
        .attr("transform", "translate(0," + (total_height - height_offset - self.options.border - 40) + ")")
        .call(self.x_axis)
        ;
    }

    if(self.updates["update_y"])
    {
      var total_width = self.element.attr("width");
      var total_height = self.element.attr("height");
      var width = Math.min(self.element.attr("width"), self.element.attr("height"));
      var height = Math.min(self.element.attr("width"), self.element.attr("height"));
      var width_offset = (total_width - width) / 2
      var height_offset = (total_height - height) / 2
      var range = [total_height - height_offset - self.options.border - 40, 0 + height_offset + self.options.border];
      self.y_axis_offset = 0 + width_offset + self.options.border;

      if(!self.options.y_string)
      {
        self.y_scale = d3.scale.linear()
          .domain([d3.min(self.options.y), d3.max(self.options.y)])
          .range(range);
      }
      else
      {
        var uniqueValues = d3.set(self.options.y).values().sort();
        self.y_scale = d3.scale.ordinal()
          .domain(uniqueValues)
          .rangePoints(range)
          ;
      }

      self.y_axis = d3.svg.axis().scale(self.y_scale).orient("left");
      self.y_axis_layer
        .attr("transform", "translate(" + self.y_axis_offset + ",0)")
        .call(self.y_axis)
        ;
    }

    if(self.updates["update_x_label"])
    {
      var x = self.svg.attr("width") / 2;
      var y = 40;

      self.x_axis_layer.selectAll(".label").remove()
      self.x_axis_layer.append("text")
        .attr("class", "label")
        .attr("x", x)
        .attr("y", y)
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .text(self.options.x_label)
        ;
    }

    if(self.updates["update_y_label"])
    {
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
        .text(self.options.y_label)
        ;
    }

    if(self.updates["render_data"])
    {
      var x = self.options.x;
      var y = self.options.y;
      var v = self.options.v;
      var indices = self.options.indices;
      var filtered_indices = self.options.filtered_indices;

      // Draw points ...
      var circle = self.datum_layer.selectAll(".datum")
        .data(filtered_indices, function(d, i){
          return d;
        })
        ;
      circle.exit()
        .remove()
        ;
      circle.enter()
        .append("circle")
        .attr("class", "datum")
        .attr("r", 4)
        .attr("stroke", "black")
        .attr("linewidth", 1)
        .attr("data-index", function(d, i) { return d; })
        .on("mouseover", function(d, i) {
          self._schedule_hover(d);
        })
        .on("mouseout", function(d, i) {
          self._cancel_hover();
        })
        ;
      circle
        .attr("cx", function(d, i) { 
          return self.x_scale( x[d] ); 
        })
        .attr("cy", function(d, i) { return self.y_scale( y[d] ); })
        .attr("fill", function(d, i) {
          var value = v[d];
          if(!self._validateValue(value))
            return $("#color-switcher").colorswitcher("get_null_color");
          else
            return self.options.colorscale(value);
        })
        ;
    }

    if(self.updates["render_selection"])
    {
      var x = self.options.x;
      var y = self.options.y;
      var v = self.options.v;
      var indices = self.options.indices;
      var filtered_selection = self.options.filtered_selection;

      var x_scale = self.x_scale;
      var y_scale = self.y_scale;

      self.selected_layer.selectAll(".selection").remove();

      var circle = self.selected_layer.selectAll(".selection")
        .data(filtered_selection, function(d, i){
          return d;
        })
        ;
      circle.enter()
        .append("circle")
        .attr("class", "selection")
        .attr("r", 8)
        .attr("stroke", "black")
        .attr("linewidth", 1)
        .attr("data-index", function(d, i) {
          return d;
        })
        .on("mouseover", function(d, i) {
          self._schedule_hover(d);
        })
        .on("mouseout", function(d, i) {
          self._cancel_hover();
        })
        ;
      circle
        .attr("cx", function(d, i) {
          return x_scale( x[d] );
        })
        .attr("cy", function(d, i) {
          return y_scale( y[d] );
        })
        .attr("fill", function(d, i) {
          var value = v[d];
          if(!self._validateValue(value))
            return $("#color-switcher").colorswitcher("get_null_color");
          else
            return self.options.colorscale(value);
        })
        ;
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
          image.width = 200;
        if(image.height === undefined)
          image.height = 200;
      });

      // Transform the list of initial images so we can pass them to _open_images()
      var width = Number(self.svg.attr("width"));
      var height = Number(self.svg.attr("height"));

      var images = [];
      self.options.open_images.forEach(function(image, index)
      {
        images.push({
          index : image.index,
          uri : image.uri.trim(),
          image_class : "open-image",
          x : width * image.relx,
          y : height * image.rely,
          width : image.width,
          height : image.height,
          target_x : self.x_scale(self.options.x[image.index]),
          target_y : self.y_scale(self.options.y[image.index]),
          });
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
        frame.find(".leader")
          .attr("x2", self.x_scale(self.options.x[image_index])-Number(frame.attr("data-transx")) )
          .attr("y2", self.y_scale(self.options.y[image_index])-Number(frame.attr("data-transy")) )
          .attr("data-targetx", self.x_scale(self.options.x[image_index]))
          .attr("data-targety", self.y_scale(self.options.y[image_index]))
          ;
      });
    }

    if(self.updates["render_legend"])
    {
      var gradient = self.legend_layer.append("defs").append("linearGradient");
      gradient.attr("id", "color-gradient")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "0%").attr("y2", "100%")
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
      var total_width = Number(self.element.attr("width"));
      var total_height = Number(self.element.attr("height"));
      var width = Math.min(self.element.attr("width"), self.element.attr("height"));
      var height = Math.min(self.element.attr("width"), self.element.attr("height"));
      var rectHeight = parseInt((height - self.options.border - 40)/2);
      var datum_layer_width = self.datum_layer.node().getBBox().width;
      var width_offset = (total_width + datum_layer_width) / 2;
      var y_axis_layer_width = self.y_axis_layer.node().getBBox().width;

      if( self.legend_layer.attr("data-status") != "moved" )
      {
        var transx = parseInt(y_axis_layer_width + 10 + width_offset);
        var transy = parseInt((total_height/2)-(rectHeight/2));
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

      if(!self.options.v_string)
      {
        self.legend_scale = d3.scale.linear()
          .domain([d3.max(self.options.v), d3.min(self.options.v)])
          .range(range)
          ;
      }
      else
      {
        var uniqueValues = d3.set(self.options.v).values().sort().reverse();
        self.legend_scale = d3.scale.ordinal()
          .domain(uniqueValues)
          .rangePoints(range)
          ;
      }

      self.legend_axis = d3.svg.axis().scale(self.legend_scale).orient("right");
      self.legend_axis_layer
        .attr("transform", "translate(" + (parseInt(self.legend_layer.select("rect.color").attr("width")) + 1) + ",0)")
        .call(self.legend_axis)
        ;
    }

    if(self.updates["update_v_label"])
    {
      console.log("updating v label.");
      self.legend_layer.selectAll(".label").remove();

      var rectHeight = parseInt(self.legend_layer.select("rect.color").attr("height"));
      var x = -15;
      var y = rectHeight/2;

      self.legend_layer.append("text")
        .attr("class", "label")
        .attr("x", x)
        .attr("y", y)
        .attr("transform", "rotate(-90," + x +"," + y + ")")
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .text(self.options.v_label)
        ;
    }

    self.updates = {}
  },

  _sync_open_images: function()
  {
    var self = this;

    // Get the scatterplot width so we can convert absolute to relative coordinates.
    var width = Number(self.svg.attr("width"));
    var height = Number(self.svg.attr("height"));
    var open_images = [];
    $(".open-image").each(function(index, frame)
    {
      var frame = $(frame);
      var image = frame.find("image.image");
      open_images.push({
        index : Number(frame.attr("data-index")),
        uri : frame.attr("data-uri"),
        relx : Number(frame.attr("data-transx")) / width,
        rely : Number(frame.attr("data-transy")) / height,
        width : Number(image.attr("width")),
        height : Number(image.attr("height")),
        });
    });
    self.element.trigger("open-images-changed", [open_images]);
  },

  _open_images: function(images)
  {
    var self = this;

    // If the list of images is empty, we're done.
    if(images.length == 0)
      return;

    var image = images[0];

    // Don't open images for hidden simulations
    if($.inArray(image.index, self.options.hidden_simulations) != -1) {
      self._open_images(images.slice(1));
      return;
    }

    // // Don't open image if it's already open
    // if($(".open-image[data-uri='" + image.uri + "']").size() > 0) {
    //   self._open_images(images.slice(1));
    //   return;
    // }

    // If image is hover and we are no longer loading this image, we're done.
    if( image.image_class == "hover-image" &&
        self.opening_image != image.index
      )
    {
      return;
    }

    // Create scaffolding and status indicator if we already don't have one
    if( self.image_layer.select("g." + image.image_class + "[data-uri='" + image.uri + "']").empty() ){

      // Define a default size for every image.
      if(image.width === undefined)
        image.width = 200;
      if(image.height === undefined)
        image.height = 200;

      // Define a default position for every image.
      if(image.x === undefined)
      {
        // We force the image to the left or right side of the screen, based on the target point position.
        var width = self.svg.attr("width");
        var range = self.x_scale.range();
        var relx = (self.x_scale(self.options.x[image.index]) - range[0]) / (range[1] - range[0]);

        if(relx < 0.5)
          image.x = parseInt(relx * range[0]);
        else
          image.x = parseInt(width - ((width - range[1]) * (1.0 - relx)) - image.width);
      }
      if(image.y === undefined)
      {
        var height = self.svg.attr("height");
        var target_y = self.y_scale(self.options.y[image.index]);
        image.y = parseInt((target_y / height) * (height - image.height));
      }

      // Tag associated point with class
      self.datum_layer.selectAll("circle[data-index='" + image.index + "']")
        .classed("openHover", true)
        ;

      var frame = self.image_layer.append("g")
        .attr("data-uri", image.uri)
        .attr("data-transx", image.x)
        .attr("data-transy", image.y)
        .attr('transform', "translate(" + image.x + ", " + image.y + ")")
        .attr("class", image.image_class + " image-frame")
        .attr("data-index", image.index)
        .attr("data-uri", image.uri)
        .call(
          d3.behavior.drag()
            .on('drag', function(){
              //console.log("frame drag");
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

                var leader = theElement.select(".leader");
                leader.attr("x2", Number(leader.attr("data-targetx")) - transx);
                leader.attr("y2", Number(leader.attr("data-targety")) - transy);
              }
            })
            .on("dragstart", function() {
              //console.log("frame dragstart");
              self.state = "moving";
              // Verify source event target
              var sourceEventTarget = d3.select(d3.event.sourceEvent.target);
              if(sourceEventTarget.classed("outline") || sourceEventTarget.classed("image"))
              {
                d3.event.sourceEvent.stopPropagation(); // silence other listeners
                // Reset tracking of hover image if we are starting to drag a hover image
                var frame = d3.select(this);
                if(frame.classed("hover-image"))
                {
                  self.opening_image = null;
                  if(self.close_hover_timer)
                  {
                    window.clearTimeout(self.close_hover_timer);
                    self.close_hover_timer = null;
                  }
                  frame.classed("hover-image", false).classed("open-image", true);
                  image.image_class = "open-image";
                  // Remove openHover class tag from any points that might have it
                  self.datum_layer.selectAll("circle.openHover")
                    .classed("openHover", false)
                    ;
                }
              }
            })
            .on("dragend", function() {
              //console.log("frame dragend");
              self.state = "";
              self._sync_open_images();
            })
        )
        .on("mousedown", function(){
          //console.log("frame mousedown");
          //d3.event.stopPropagation();
          // Verify that click is on image, not something else like the close button
          if(d3.event.target.classList.contains("image"))
          {
            // Move this image to the top of the Z order ...
            $(d3.event.target.parentNode).detach().appendTo(self.image_layer.node());
          }
        })
        .on("mouseup", function(){
          //console.log("frame mouseup");
          //d3.event.stopPropagation();
        })
        ;

      // Create the leader line ...
      if("target_x" in image && "target_y" in image)
      {
        frame.append("line")
          .attr("class", "leader")
          .attr("x1", (image.width / 2))
          .attr("y1", (image.height / 2))
          .attr("x2", image.target_x - Number(frame.attr("data-transx")))
          .attr("y2", image.target_y - Number(frame.attr("data-transy")))
          .attr("data-targetx", image.target_x)
          .attr("data-targety", image.target_y)
          .style("stroke", "black")
          .style("stroke-width", 1.0)
          ;
      }

      // Create an outline ...
      var outline = frame.append("rect")
        .attr("class", "outline")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", image.width + 1)
        .attr("height", image.height + 1)
        .style("stroke", "black")
        .style("stroke-width", "1px")
        .style("fill", "white")
        ;

      // // Create the loading image ...
      // var timeout_image = frame.append("image")
      //   .attr("class", "loading-image")
      //   .attr("xlink:href", "/css/ajax-loader.gif")
      //   .attr("x", (image.width / 2)-16)
      //   .attr("y", (image.height / 2)-16)
      //   .attr("width", 32)
      //   .attr("height", 32)
      //   ;

      // Schedule timeout for hover
      self.close_hover_timer = window.setTimeout(function() {self._hover_timeout(image.index, 0);}, 1000);
    }

    // If the image is already in the cache, display it.
    if(image.uri in self.image_cache)
    {
      console.log("Displaying image " + image.uri + " from cache");
      var url_creator = window.URL || window.webkitURL;
      var image_url = url_creator.createObjectURL(self.image_cache[image.uri]);

      // Define a default size for every image.
      if(image.width === undefined)
        image.width = 200;
      if(image.height === undefined)
        image.height = 200;

      // Define a default position for every image.
      if(image.x === undefined)
      {
        // We force the image to the left or right side of the screen, based on the target point position.
        var width = self.svg.attr("width");
        var range = self.x_scale.range();
        var relx = (self.x_scale(self.options.x[image.index]) - range[0]) / (range[1] - range[0]);

        if(relx < 0.5)
          image.x = relx * range[0];
        else
          image.x = width - ((width - range[1]) * (1.0 - relx)) - image.width;
      }
      if(image.y === undefined)
      {
        var height = self.svg.attr("height");
        var target_y = self.y_scale(self.options.y[image.index]);
        image.y = (target_y / height) * (height - image.height);
      }

      var frame = self.image_layer.select("g." + image.image_class + "[data-uri='" + image.uri + "']");

      // Create the image ...
      var svgImage = frame.append("image")
        .attr("class", "image")
        .attr("xlink:href", image_url)
        .attr("x", 0.5)
        .attr("y", 0.5)
        .attr("width", image.width)
        .attr("height", image.height)
        .attr("data-ratio", image.width / image.height)
        ;

      // Create a resize handle
      var resize_handle = frame.append("g")
        .attr("class", "resize-handle")
        .attr('transform', "translate(" + (image.width-9) + ", " + (image.height-9) + ")")
        .call(
          d3.behavior.drag()
            .on('drag', function(){
              //console.log("resize drag");
              // Make sure mouse is inside svg element
              if( 0 <= d3.event.y && d3.event.y <= self.options.height && 0 <= d3.event.x && d3.event.x <= self.options.width ){
                var frame = d3.select(this.parentNode);
                var theImage = frame.select("image.image");
                var width = Number(theImage.attr("width"));
                var height = Number(theImage.attr("height"));
                var theRectangle = frame.select("rect.outline");
                var theHandle = d3.select(this);
                var theLine = frame.select("line.leader");
                var thePin = frame.select('.pin-button');
                var ratio = Number(theImage.attr("data-ratio"));
                var newWidth, newHeight;
                var x = d3.event.x;
                var y = d3.event.y;
                var min = 50;
                if(x < min)
                  x = min;
                if(y < min)
                  y = min;
                newWidth = x;
                newHeight = newWidth / ratio;
                if(newHeight > y) {
                  newHeight = y;
                  newWidth = newHeight * ratio;
                }
                theImage.attr("width", newWidth);
                theImage.attr("height", newHeight);
                theRectangle.attr("width", newWidth+1);
                theRectangle.attr("height", newHeight+1);
                theHandle.attr('transform', "translate(" + (newWidth-9) + ", " + (newHeight-9) + ")");
                thePin.attr('transform',  'translate(' + (newWidth-20) + ',0)');
                theLine.attr("x1", (newWidth / 2));
                theLine.attr("y1", (newHeight / 2));

              }
            })
            .on("dragstart", function() {
              //console.log("resize dragstart");
              self.state = "resizing";
              d3.selectAll([this.parentNode, d3.select("#scatterplot").node()]).classed("resizing", true);
              d3.event.sourceEvent.stopPropagation(); // silence other listeners
              // Reset tracking of hover image if we are starting to drag a hover image
              var frame = d3.select(this.parentNode);
              if(frame.classed("hover-image"))
              {
                self.opening_image = null;
                if(self.close_hover_timer)
                {
                  window.clearTimeout(self.close_hover_timer);
                  self.close_hover_timer = null;
                }
                frame.classed("hover-image", false).classed("open-image", true);
                image.image_class = "open-image";

                // Remove openHover class tag from any points that might have it
                self.datum_layer.selectAll("circle.openHover")
                  .classed("openHover", false)
                  ;
              }
            })
            .on("dragend", function() {
              //console.log("resize dragend");
              d3.selectAll([this.parentNode, d3.select("#scatterplot").node()]).classed("resizing", false);
              self.state = "";
              self._sync_open_images();
            })
        )
        .on("mousedown", function(){
          //console.log("resize mousedown");
          //d3.event.stopPropagation(); // silence other listeners
        })
        .on("mouseup", function(){
          //console.log("resize mouseup");
          //d3.event.stopPropagation(); // silence other listeners
        })
        ;

      resize_handle.append("path")
        .attr("d", "M0,8 L8,0 M4,8 L8,4")
        .style("stroke", "#878787")
        .style("stroke-width", 1)
        .style("pointer-events", "none")
        ;

      resize_handle.append("rect")
        .attr("class", "resize-handle-mousetarget")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", "transparent")
        ;

      // Create a close button ...
      var close_button = frame.append("g")
        .attr("class", "close-button");
      close_button.append("rect")
        .attr("x", 5)
        .attr("y", 5)
        .attr("width", 16)
        .attr("height", 16)
        .attr("rx", 2)
        .attr("ry", 2)
        .style("fill", "rgba(0%,0%,0%,0.2)")
        .on("mousedown", function(){
          //console.log("close button mousedown");
          d3.event.stopPropagation(); // silence other listeners
        })
        .on("mouseup", function(){
          //console.log("close button mouseup");
          d3.event.stopPropagation(); // silence other listeners
        })
        .on("click", function()
        {
          //console.log("close button click");
          d3.event.stopPropagation(); // silence other listeners
          var frame = d3.select(d3.event.target.parentNode.parentNode);
          frame.remove();
          self._sync_open_images();
        })
        ;

      close_button.append("path")
        .attr("d", "M" + (8) + " " + (8) + " l10 10 m0 -10 l-10 10")
        .style("stroke", "rgba(100%,100%,100%, 0.8)")
        .style("stroke-width", 3)
        .style("pointer-events", "none")
        ;

      // Create a pin button ...
      var pin_button = frame.append("g")
        .attr('class', 'pin-button')
        .attr('transform', "translate(" + (image.width-20) + ",0)");

      pin_button.append("image")
        .attr("class", "pin-icon")
        .attr("x", 2)
        .attr("y", 2)
        .attr("width", 16)
        .attr("height", 16)
        .attr("xlink:href", "/css/pin.png")
        .on("mousedown", function(){
          //console.log("pin button mousedown");
          d3.event.stopPropagation(); // silence other listeners
        })
        .on("mouseup", function(){
          //console.log("pin button mouseup");
          d3.event.stopPropagation(); // silence other listeners
        })
        .on("click", function()
        {
          d3.event.stopPropagation(); // silence other listeners
          // Reset tracking of hover image
          self.opening_image = null;
          if(self.close_hover_timer)
          {
            window.clearTimeout(self.close_hover_timer);
            self.close_hover_timer = null;
          }

          // Remove openHover class tag from any points that might have it
          self.datum_layer.selectAll("circle.openHover")
            .classed("openHover", false)
            ;

          var frame = d3.select(d3.event.target.parentNode.parentNode);
          var theImage = frame.select("image.image");
          var theRectangle = frame.select("rect.outline");
          var theHandle = frame.select("g.resize-handle");
          var theLine = frame.select("line.leader");
          var thePin = frame.select('.pin-button');
          frame.classed("hover-image", false)
            .classed("open-image", true)
            ;

          // Adjust image position
          var imageHeight = 200;
          var imageWidth = 200;

          var width = self.svg.attr("width");
          var range = self.x_scale.range();
          var relx = (self.x_scale(self.options.x[image.index]) - range[0]) / (range[1] - range[0]);
          var x, y;

          if(relx < 0.5)
            x = relx * range[0];
          else
            x = width - ((width - range[1]) * (1.0 - relx)) - imageWidth;

          var height = self.svg.attr("height");
          var target_y = self.y_scale(self.options.y[image.index]);
          y = (target_y / height) * (height - imageHeight);

          frame
            .attr("data-transx", x)
            .attr("data-transy", y)
            .attr('transform', "translate(" + x + ", " + y + ")")
            ;

          // Adjust image size
          theImage.attr("width", imageWidth);
          theImage.attr("height", imageHeight);
          theRectangle.attr("width", imageWidth+1);
          theRectangle.attr("height", imageHeight+1);
          theHandle.attr('transform', "translate(" + (imageWidth-9) + ", " + (imageHeight-9) + ")");
          thePin.attr('transform', 'translate(' + (imageWidth-20) + ',0)');

          // Adjust line
          theLine
            .attr("x1", (imageWidth / 2))
            .attr("y1", (imageHeight / 2))
            .attr("x2", image.target_x - Number(frame.attr("data-transx")))
            .attr("y2", image.target_y - Number(frame.attr("data-transy")))
            ;

          self._sync_open_images();
        })
        ;

      if(!image.no_sync)
        self._sync_open_images();
      self._open_images(images.slice(1));
      return;
    }

    // If we don't have a session for the image hostname, create one.
    var parser = document.createElement("a");
    parser.href = image.uri.substr(0, 5) == "file:" ? image.uri.substr(5) : image.uri;
    if(!(parser.hostname in self.session_cache))
    {
      self._open_session(images);
      return;
    }

    // Retrieve the image.
    console.log("Loading image " + image.uri + " from server");
    var xhr = new XMLHttpRequest();
    xhr.image = image;
    xhr.open("GET", self.options.server_root + "remotes/" + self.session_cache[parser.hostname] + "/file" + parser.pathname, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function(e)
    {
      // If we get 404, the remote session no longer exists because it timed-out.
      // If we get 500, there was an internal error communicating to the remote host.
      // Either way, delete the cached session and create a new one.
      if(this.status == 404 || this.status == 500)
      {
        delete self.session_cache[parser.hostname];
        self._open_session(images);
        return;
      }
      // If we get 400, it means that the session is good and we're
      // communicating with the remote host, but something else went wrong
      // (probably file permissions issues).
      if(this.status == 400)
      {
	      console.log(this);
        window.alert("Couldn't load image " + this.image.uri + ": " + this.statusText);
        return;
      }

      // We received the image, so put it in the cache and start-over.
      var array_buffer_view = new Uint8Array(this.response);
      var blob = new Blob([array_buffer_view], {type:"image/jpeg"});
      self.image_cache[image.uri] = blob;
      // Adding lag for testing purposed. This should not exist in production.
      // setTimeout(function(){
      self._open_images(images);
      return;
      // }, 5000);
    }
    xhr.send();
  },

  _close_hidden_simulations: function()
  {
    var self = this;
    $("g.image-frame")
      .filter(function(){
        return $.inArray($(this).data("index"), self.options.filtered_indices) == -1
      })
      .remove()
      ;
  },

  _open_session: function(images)
  {
    var self = this;

    if(images.length == 0)
      return;
    var image = images[0];

    var parser = document.createElement("a");
    parser.href = image.uri.substr(0, 5) == "file:" ? image.uri.substr(5) : image.uri;

    $("#remote-hostname").text("Login to retrieve " + parser.pathname + " from " + parser.hostname);
    $("#remote-error").text(image.last_error).css("display", image.last_error ? "block" : "none");
    self.login.dialog(
    {
      buttons:
      {
        "Login": function()
        {
          $.ajax(
          {
            async : true,
            type : "POST",
            url : self.options.server_root + "remotes",
            contentType : "application/json",
            data : $.toJSON({"hostname":parser.hostname, "username":$("#remote-username").val(), "password":$("#remote-password").val()}),
            processData : false,
            success : function(result)
            {
              self.session_cache[parser.hostname] = result.sid;
              self.login.dialog("close");
              self._open_images(images);
            },
            error : function(request, status, reason_phrase)
            {
              image.last_error = "Error opening remote session: " + reason_phrase;
              self.login.dialog("close");
              self._open_session(images);
            }
          });
        },
        Cancel: function()
        {
          $(this).dialog("close");
        }
      },
    });
    self.login.dialog("open");
  },

  _schedule_hover: function(image_index)
  {
    var self = this;

    // Disable hovering whenever anything else is going on ...
    if(self.state != "")
      return;

    // Disable hovering when there are no image columns
    if(self.options.images == null || self.options.images.length == 0)
      return;

    // Disable hovering when there is no uri
    if(self.options.images[self.options.indices[image_index]].trim() == "")
      return;

    // // Disable hovering on points that already have open imges ...
    // var uri = self.options.images[self.options.indices[image_index]];
    // if($(".open-image[data-uri='" + uri + "']").size() != 0)
    //   return;

    // Cancel any pending hover ...
    self._cancel_hover();

    // Start the timer for the new hover ...
    self.hover_timer = window.setTimeout(function() { self._open_hover(image_index); }, 250);
  },

  _cancel_hover: function()
  {
    var self = this;
    if(self.hover_timer)
    {
      window.clearTimeout(self.hover_timer);
      self.hover_timer = null;
    }
  },

  _open_hover: function(image_index)
  {
    var self = this;

    // Verify that we don't already have an open hover for the associated point
    if( self.datum_layer.select("circle.openHover[data-index='" + image_index + "']").empty() )
    {
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
        x : self.x_scale(self.options.x[image_index]) + 10,
        y : Math.min(self.y_scale(self.options.y[image_index]) + 10, self.svg.attr("height") - hover_height - self.options.border - 10),
        width : hover_width,
        height : hover_height,
        target_x : self.x_scale(self.options.x[image_index]),
        target_y : self.y_scale(self.options.y[image_index]),
        no_sync : true,
        }]);

      // self.close_hover_timer = window.setTimeout(function() {self._hover_timeout(image_index, 0);}, 1000);
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
    var hoverEmpty = self.image_layer.selectAll(".hover-image[data-index='" + image_index + "']:hover").empty();
    var circleEmpty = self.datum_layer.selectAll("circle[data-index='" + image_index + "']:hover").empty();
    var selectedCircleEmpty = self.selected_layer.selectAll("circle[data-index='" + image_index + "']:hover").empty();

    return !(hoverEmpty && circleEmpty && selectedCircleEmpty);
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
    self._cancel_hover();

    // Close any current hover images ...
    self.image_layer.selectAll(".hover-image").remove();

    // Remove openHover class tag from any points that might have it
    self.datum_layer.selectAll("circle.openHover")
      .classed("openHover", false)
      ;
  },
});
