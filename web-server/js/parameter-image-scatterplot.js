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
    this.start_drag = null;
    this.end_drag = null;

    this.svg = d3.select(this.element.get(0));
    this.datum_layer = this.svg.append("g");
    this.selected_layer = this.svg.append("g");
    this.selection_layer = this.svg.append("g");
    this.image_layer = this.svg.append("g");

    this.session_cache = {};

    this.updates = {};
    this.update_timer = null;
    this._schedule_update({update_indices:true, update_width:true, update_height:true, update_x:true, update_y:true, update_color_domain:true, render_data:true, render_selection:true});

    var self = this;

    this.element.mousedown(function(e)
    {
      self.start_drag = [e.originalEvent.layerX, e.originalEvent.layerY];
      self.end_drag = null;
    });

    this.element.mousemove(function(e)
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

    this.element.mouseup(function(e)
    {
      if(!e.ctrlKey)
        self.options.selection = [];

      var x = self.options.x;
      var y = self.options.y;
      var count = x.length;

      if(self.start_drag && self.end_drag) // Rubber-band selection ...
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
            self._show_image({uri:self.options.images[self.options.indices[i]], image_class:"visible-image"});
            break;
          }
        }
      }

      self.start_drag = null;
      self.end_drag = null;

      self._schedule_update({render_selection:true});
      self.element.trigger("selection-changed", [self.options.selection]);
    });
  },

  _setOption: function(key, value)
  {
    //console.log("parameter_image.scatterplot._setOption()", key, value);
    this.options[key] = value;

    if(key == "indices")
    {
      this._schedule_update({update_indices:true, render_selection:true});
    }

    else if(key == "x")
    {
      this._schedule_update({update_x:true, render_data:true, render_selection:true});
    }

    else if(key == "y")
    {
      this._schedule_update({update_y:true, render_data:true, render_selection:true});
    }

    else if(key == "v")
    {
      this._schedule_update({update_color_domain:true, render_data:true, render_selection:true});
    }

    else if(key == "images")
    {
    }

    else if(key == "selection")
    {
      this._schedule_update({render_selection:true});
    }

    else if(key == "color")
    {
      this._schedule_update({update_color_domain:true, render_data:true, render_selection:true});
    }

    else if(key == "width")
    {
      this._schedule_update({update_width:true, update_x:true, render_data:true, render_selection:true});
    }

    else if(key == "height")
    {
      this._schedule_update({update_height:true, update_y:true, render_data:true, render_selection:true});
    }

    else if(key == "border")
    {
      this._schedule_update({update_x:true, update_y:true, render_data:true, render_selection:true});
    }
  },

  _schedule_update: function(updates)
  {
    for(var key in updates)
      this.updates[key] = updates[key];

    if(this.update_timer)
      return;

    var self = this;
    this.update_timer = window.setTimeout(function() { self._update(); }, 0);
  },

  _update: function()
  {
    var self = this;

    //console.log("parameter_image.scatterplot._update()", this.updates);
    this.update_timer = null;

    if(this.updates["update_width"])
    {
      this.element.attr("width", this.options.width);
    }

    if(this.updates["update_height"])
    {
      console.log("update_height");
      this.element.attr("height", this.options.height);
    }

    if(this.updates["update_indices"])
    {
      this.inverse_indices = {};
      var count = this.options.indices.length;
      for(var i = 0; i != count; ++i)
        this.inverse_indices[this.options.indices[i]] = i;
    }

    if(this.updates["update_x"])
    {
      this.x_scale = d3.scale.linear().domain([d3.min(this.options.x), d3.max(this.options.x)]).range([0 + this.options.border, this.element.attr("width") - this.options.border]);
    }

    if(this.updates["update_y"])
    {
      console.log(this.element.attr("height"));
      this.y_scale = d3.scale.linear().domain([d3.min(this.options.y), d3.max(this.options.y)]).range([this.element.attr("height") - this.options.border, 0 + this.options.border]);
    }

    if(this.updates["update_color_domain"])
    {
      var v_min = d3.min(this.options.v);
      var v_max = d3.max(this.options.v);
      var domain = []
      var domain_scale = d3.scale.linear().domain([0, this.options.color.domain().length]).range([v_min, v_max]);
      for(var i in this.options.color.domain())
        domain.push(domain_scale(i));
      this.options.color.domain(domain);
    }

    var width = this.element.attr("width");
    var height = this.element.attr("height");

    if(this.updates["render_data"])
    {
      var count = this.options.x.length;
      var x = this.options.x;
      var y = this.options.y;
      var v = this.options.v;

      // Draw points ...
      this.datum_layer.selectAll(".datum")
        .data(x)
      .enter().append("circle")
        .attr("class", "datum")
        .attr("r", 4)
        .attr("stroke", "black")
        .attr("linewidth", 1)
        .on("mouseover", function(d, i)
          {
            self._hide_hover_image();
            self._show_image({uri:self.options.images[self.options.indices[i]], image_class:"hover-image", x:self.x_scale(x[i]) + 10, y:self.y_scale(y[i]) + 10});
          })
        .on("mouseout", function(d, i)
          {
            self._hide_hover_image();
          })
        ;

      this.datum_layer.selectAll(".datum")
        .attr("cx", function(d, i) { return self.x_scale(x[i]); })
        .attr("cy", function(d, i) { return self.y_scale(y[i]); })
        .attr("fill", function(d, i) { return self.options.color(v[self.options.indices[i]]); })
        ;
    }

    if(this.updates["render_selection"])
    {
      var x = this.options.x;
      var y = this.options.y;
      var v = this.options.v;
      var color = this.options.color;
      var indices = this.options.indices;
      var selection = this.options.selection;

      var x_scale = this.x_scale;
      var y_scale = this.y_scale;
      var inverse_indices = this.inverse_indices;

      this.selected_layer.selectAll(".selection").remove();

      this.selected_layer.selectAll(".selection")
        .data(selection)
      .enter().append("circle")
        .attr("class", "selection")
        .attr("r", 8)
        .attr("stroke", "black")
        .attr("linewidth", 1)
        ;

      this.selected_layer.selectAll(".selection")
        .attr("cx", function(d, i) { return x_scale(x[inverse_indices[selection[i]]]); })
        .attr("cy", function(d, i) { return y_scale(y[inverse_indices[selection[i]]]); })
        .attr("fill", function(d, i) { return color(v[selection[i]]); })
        ;
    }

    this.updates = {}
  },

  _show_image: function(options)
  {
    var self = this;
    var uri = options.uri;
    var image_class = options.image_class;
    var x = options.x;
    if(x === undefined)
      x = 10 * this.image_layer.selectAll("image").size();
    var y = options.y;
    if(y === undefined)
      y = 10 * this.image_layer.selectAll("image").size();

    console.log(uri, image_class, x, y);

    this._session_prompt(uri);

    var parser = document.createElement("a");
    parser.href = uri.substr(0, 5) == "file:" ? uri.substr(5) : uri;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", this.options.server_root + "remote/" + this.session_cache[parser.hostname] + "/file" + parser.pathname, true);
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

      self.image_layer.append("image")
        .attr("class", image_class)
        .attr("xlink:href", image_url)
        .attr("x", x)
        .attr("y", y)
        .attr("width", 200)
        .attr("height", 200)
        ;
    }
    xhr.send();
  },

  _session_prompt: function(uri)
  {
    var parser = document.createElement("a");
    parser.href = uri.substr(0, 5) == "file:" ? uri.substr(5) : uri;
    if(parser.hostname in this.session_cache)
      return;

    var username = window.prompt(parser.hostname + " username");
    var password = window.prompt(parser.hostname + " password");

    $.ajax(
    {
      context: this,
      async : false,
      type : "POST",
      url : this.options.server_root + "remote",
      contentType : "application/json",
      data : $.toJSON({"hostname":parser.hostname, "username":username, "password":password}),
      processData : false,
      success : function(result)
      {
        this.session_cache[parser.hostname] = result.sid;
      },
      error : function(request, status, reason_phrase)
      {
        window.alert("Error opening remote session: " + reason_phrase);
      }
    });
  },

  _hide_hover_image: function()
  {
    this.image_layer.selectAll(".hover-image").remove();
  },
});

