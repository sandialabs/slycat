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
    x : [],
    y : [],
    v : [],
    images : [],
    selection : [],
    color : d3.scale.linear().domain([-1, 0, 1]).range(["blue", "white", "red"]),
    border : 25,
    server_root : "",
  },

  _create: function()
  {
    var self = this;

    self.state = "";
    self.start_drag = null;
    self.current_drag = null;
    self.end_drag = null;

    self.svg = d3.select(self.element.get(0));
    self.x_axis_layer = self.svg.append("g").attr("class", "x-axis");
    self.y_axis_layer = self.svg.append("g").attr("class", "y-axis");
    self.datum_layer = self.svg.append("g");
    self.selected_layer = self.svg.append("g");
    self.selection_layer = self.svg.append("g");
    self.image_layer = self.svg.append("g");

    self.session_cache = {};

    self.updates = {};
    self.update_timer = null;
    self._schedule_update({update_indices:true, update_width:true, update_height:true, update_x:true, update_y:true, update_color_domain:true, render_data:true, render_selection:true});

    self.element.mousedown(function(e)
    {
      self.start_drag = [e.originalEvent.layerX, e.originalEvent.layerY];
      self.end_drag = null;
    });

    self.element.mousemove(function(e)
    {
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
            self.state = "rubber-band";
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
      if(!e.ctrlKey)
        self.options.selection = [];

      var x = self.options.x;
      var y = self.options.y;
      var count = x.length;

      if(self.state == "rubber-band") // Rubber-band selection ...
      {
        self.selection_layer.selectAll(".rubberband").remove();

        var x1 = self.x_scale.invert(Math.min(self.start_drag[0], self.end_drag[0]));
        var y1 = self.y_scale.invert(Math.max(self.start_drag[1], self.end_drag[1]));
        var x2 = self.x_scale.invert(Math.max(self.start_drag[0], self.end_drag[0]));
        var y2 = self.y_scale.invert(Math.min(self.start_drag[1], self.end_drag[1]));

        for(var i = 0; i != count; ++i)
        {
          if(x1 <= x[i] && x[i] <= x2 && y1 <= y[i] && y[i] <= y2)
          {
            var index = self.options.selection.indexOf(self.options.indices[i]);
            if(index == -1)
              self.options.selection.push(self.options.indices[i]);
          }
        }
      }
      else // Pick selection ...
      {
        var x1 = self.x_scale.invert(e.originalEvent.layerX - self.options.pick_distance);
        var y1 = self.y_scale.invert(e.originalEvent.layerY + self.options.pick_distance);
        var x2 = self.x_scale.invert(e.originalEvent.layerX + self.options.pick_distance);
        var y2 = self.y_scale.invert(e.originalEvent.layerY - self.options.pick_distance);

        for(var i = 0; i != count; ++i)
        {
          if(x1 <= x[i] && x[i] <= x2 && y1 <= y[i] && y[i] <= y2)
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

            // Make the image visible ...
            self._hide_hover_image();
            self._show_image({
              uri : self.options.images[self.options.indices[i]],
              image_class : "visible-image",
              target_x : self.x_scale(self.options.x[i]),
              target_y : self.y_scale(self.options.y[i]),
              });
            break;
          }
        }
      }

      self.start_drag = null;
      self.end_drag = null;
      self.state = "";

      self._schedule_update({render_selection:true});
      self.element.trigger("selection-changed", [self.options.selection]);
    });
  },

  _setOption: function(key, value)
  {
    var self = this;

    //console.log("parameter_image.scatterplot._setOption()", key, value);
    self.options[key] = value;

    if(key == "indices")
    {
      self._schedule_update({update_indices:true, render_selection:true});
    }

    else if(key == "x")
    {
      self._schedule_update({update_x:true, render_data:true, render_selection:true});
    }

    else if(key == "y")
    {
      self._schedule_update({update_y:true, render_data:true, render_selection:true});
    }

    else if(key == "v")
    {
      self._schedule_update({update_color_domain:true, render_data:true, render_selection:true});
    }

    else if(key == "images")
    {
    }

    else if(key == "selection")
    {
      self._schedule_update({render_selection:true});
    }

    else if(key == "color")
    {
      self._schedule_update({update_color_domain:true, render_data:true, render_selection:true});
    }

    else if(key == "width")
    {
      self._schedule_update({update_width:true, update_x:true, render_data:true, render_selection:true});
    }

    else if(key == "height")
    {
      self._schedule_update({update_height:true, update_y:true, render_data:true, render_selection:true});
    }

    else if(key == "border")
    {
      self._schedule_update({update_x:true, update_y:true, render_data:true, render_selection:true});
    }
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
    }

    if(self.updates["update_height"])
    {
      self.element.attr("height", self.options.height);
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
      var width_offset = (total_width - width) / 2
      var height_offset = (total_height - height) / 2

      self.x_scale = d3.scale.linear().domain([d3.min(self.options.x), d3.max(self.options.x)]).range([0 + width_offset + self.options.border, total_width - width_offset - self.options.border]);
      self.x_axis = d3.svg.axis().scale(self.x_scale).orient("bottom");
      self.x_axis_layer
        .attr("transform", "translate(0," + (total_height - height_offset - self.options.border) + ")")
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

      self.y_scale = d3.scale.linear().domain([d3.min(self.options.y), d3.max(self.options.y)]).range([total_height - height_offset - self.options.border, 0 + height_offset + self.options.border]);
      self.y_axis = d3.svg.axis().scale(self.y_scale).orient("left");
      self.y_axis_layer
        .attr("transform", "translate(" + (0 + width_offset + self.options.border) + ",0)")
        .call(self.y_axis)
        ;
    }

    if(self.updates["update_color_domain"])
    {
      var v_min = d3.min(self.options.v);
      var v_max = d3.max(self.options.v);
      var domain = []
      var domain_scale = d3.scale.linear().domain([0, self.options.color.domain().length]).range([v_min, v_max]);
      for(var i in self.options.color.domain())
        domain.push(domain_scale(i));
      self.options.color.domain(domain);
    }

    var width = self.element.attr("width");
    var height = self.element.attr("height");

    if(self.updates["render_data"])
    {
      var count = self.options.x.length;
      var x = self.options.x;
      var y = self.options.y;
      var v = self.options.v;

      // Draw points ...
      self.datum_layer.selectAll(".datum")
        .data(x)
      .enter().append("circle")
        .attr("class", "datum")
        .attr("r", 4)
        .attr("stroke", "black")
        .attr("linewidth", 1)
        .on("mouseover", function(d, i)
          {
            if(self.state == "rubber-band") // Rubber-band selection ...
              return;

            self._hide_hover_image();
            self._show_image({
              uri : self.options.images[self.options.indices[i]],
              image_class : "hover-image",
              x : self.x_scale(x[i]) + 10,
              y : self.y_scale(y[i]) + 10,
              target_x : self.x_scale(x[i]),
              target_y : self.y_scale(y[i]),
              });
          })
        .on("mouseout", function(d, i)
          {
            self._hide_hover_image();
          })
        ;

      self.datum_layer.selectAll(".datum")
        .attr("cx", function(d, i) { return self.x_scale(x[i]); })
        .attr("cy", function(d, i) { return self.y_scale(y[i]); })
        .attr("fill", function(d, i) { return self.options.color(v[self.options.indices[i]]); })
        ;
    }

    if(self.updates["render_selection"])
    {
      var x = self.options.x;
      var y = self.options.y;
      var v = self.options.v;
      var color = self.options.color;
      var indices = self.options.indices;
      var selection = self.options.selection;

      var x_scale = self.x_scale;
      var y_scale = self.y_scale;
      var inverse_indices = self.inverse_indices;

      self.selected_layer.selectAll(".selection").remove();

      self.selected_layer.selectAll(".selection")
        .data(selection)
      .enter().append("circle")
        .attr("class", "selection")
        .attr("r", 8)
        .attr("stroke", "black")
        .attr("linewidth", 1)
        ;

      self.selected_layer.selectAll(".selection")
        .attr("cx", function(d, i) { return x_scale(x[inverse_indices[selection[i]]]); })
        .attr("cy", function(d, i) { return y_scale(y[inverse_indices[selection[i]]]); })
        .attr("fill", function(d, i) { return color(v[selection[i]]); })
        ;
    }

    self.updates = {}
  },

  _show_image: function(options)
  {
    var self = this;
    var uri = options.uri;
    var image_class = options.image_class;
    var x = options.x;
    if(x === undefined)
      x = 10 + (10 * self.image_layer.selectAll("image").size());
    var y = options.y;
    if(y === undefined)
      y = 10 + (10 * self.image_layer.selectAll("image").size());
    var target_x = options.target_x;
    var target_y = options.target_y;
    var width = 200;
    var height = 200;

    console.log(uri, image_class, x, y);

    self._session_prompt(uri);

    var parser = document.createElement("a");
    parser.href = uri.substr(0, 5) == "file:" ? uri.substr(5) : uri;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", self.options.server_root + "remote/" + self.session_cache[parser.hostname] + "/file" + parser.pathname, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function(e)
    {
      // If the remote session timed-out, prompt the user for credentials again and start over.
      if(this.status == 404)
      {
        delete self.session_cache[parser.hostname];
        self._session_prompt(uri);
        self._show_image(uri);
        return;
      }

      var array_buffer_view = new Uint8Array(this.response);
      var blob = new Blob([array_buffer_view], {type:"image/jpeg"});
      var url_creator = window.URL || window.webkitURL;
      var image_url = url_creator.createObjectURL(blob);

      var frame = self.image_layer.append("g")
        .attr("class", image_class)
        ;

      var leader = frame.append("line")
        .attr("class", "leader")
        .attr("x1", x + (width / 2))
        .attr("y1", y + (height / 2))
        .attr("x2", target_x)
        .attr("y2", target_y)
        .style("stroke", "black")
        .style("stroke-width", 1.0)
        ;

      var image = frame.append("image")
        .attr("class", "image")
        .attr("xlink:href", image_url)
        .attr("x", x)
        .attr("y", y)
        .attr("width", width)
        .attr("height", height)
        .on("mousedown", function()
          {
            var mouse = d3.mouse(self.element.get(0));
            self.state = "drag-image";
            self.start_drag = mouse;
            self.end_drag = self.start_drag;
            d3.event.stopPropagation();
          })
        .on("mousemove", function()
          {
            if(self.state == "drag-image")
            {
              var mouse = d3.mouse(self.element.get(0));
              var dx = mouse[0] - self.end_drag[0];
              var dy = mouse[1] - self.end_drag[1];
              self.end_drag = mouse;
              d3.event.stopPropagation();

              var frame = d3.select(d3.event.target.parentNode);
              var image = frame.select("image");
              var leader = frame.select("line");

              image.attr("x", Number(image.attr("x")) + dx);
              image.attr("y", Number(image.attr("y")) + dy);

              leader.attr("x1", Number(leader.attr("x1")) + dx);
              leader.attr("y1", Number(leader.attr("y1")) + dy);
            }
          })
        .on("mouseup", function()
          {
            self.state = "";
            d3.event.stopPropagation();
          })
        ;
    }
    xhr.send();
  },

  _session_prompt: function(uri)
  {
    var self = this;

    var parser = document.createElement("a");
    parser.href = uri.substr(0, 5) == "file:" ? uri.substr(5) : uri;
    if(parser.hostname in self.session_cache)
      return;

    var username = window.prompt(parser.hostname + " username");
    var password = window.prompt(parser.hostname + " password");

    $.ajax(
    {
      async : false,
      type : "POST",
      url : self.options.server_root + "remote",
      contentType : "application/json",
      data : $.toJSON({"hostname":parser.hostname, "username":username, "password":password}),
      processData : false,
      success : function(result)
      {
        self.session_cache[parser.hostname] = result.sid;
      },
      error : function(request, status, reason_phrase)
      {
        window.alert("Error opening remote session: " + reason_phrase);
      }
    });
  },

  _hide_hover_image: function()
  {
    var self = this;
    self.image_layer.selectAll(".hover-image").remove();
  },
});

