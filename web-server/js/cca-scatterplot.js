/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

//////////////////////////////////////////////////////////////////////////////////
// HTML5 canvas scatterplot visualization, for use with the cca model.

$.widget("cca.scatterplot",
{
  options:
  {
    width : 300,
    height : 300,
    pick_distance : 3,
    drag_threshold : 3,
    x : [],
    y : [],
    v : [],
    selection : [],
    color : d3.scale.linear().range(["blue", "white", "red"])
  },

  _create: function()
  {
    this.start_drag = null;
    this.end_drag = null;

    this.main_context = this.element.get(0).getContext("2d");

    this.data_canvas = $("<canvas>");
    this.data_context = this.data_canvas.get(0).getContext("2d");

    this.selection_canvas = $("<canvas>");
    this.selection_context = this.selection_canvas.get(0).getContext("2d");

    this.render_data = false;
    this.render_selection = false;
    this.update = null;
    this._schedule_update(true, true);

    var self = this;

    this.element.mousedown(function(e)
    {
      self.start_drag = [e.layerX, e.layerY];
      self.end_drag = null;
    });

    this.element.mousemove(function(e)
    {
      if(self.start_drag) // Mouse is down ...
      {
        if(self.end_drag) // Already dragging ...
        {
          self.end_drag = [e.layerX, e.layerY];

          var width = self.element.width();
          var height = self.element.height();

          self.main_context.clearRect(0, 0, width, height);
          self.main_context.drawImage(self.data_canvas.get(0), 0, 0);
          self.main_context.drawImage(self.selection_canvas.get(0), 0, 0);
          self.main_context.fillStyle = "rgba(255, 255, 0, 0.3)";
          self.main_context.fillRect(self.start_drag[0], self.start_drag[1], self.end_drag[0] - self.start_drag[0], self.end_drag[1] - self.start_drag[1]);
          self.main_context.strokeStyle = "rgb(255, 255, 0)";
          self.main_context.lineWidth = 2.0;
          self.main_context.strokeRect(self.start_drag[0], self.start_drag[1], self.end_drag[0] - self.start_drag[0], self.end_drag[1] - self.start_drag[1]);
        }
        else
        {
          if(Math.abs(e.layerX - self.start_drag[0]) > self.options.drag_threshold || Math.abs(e.layerY - self.start_drag[1]) > self.options.drag_threshold) // Start dragging ...
          {
            self.end_drag = [e.layerX, e.layerY];
          }
        }
      }
    });

    this.element.mouseup(function(e)
    {
      self.options.selection = [];

      if(self.start_drag && self.end_drag) // Rubber-band selection ...
      {
        var width = self.element.width();
        var height = self.element.height();

        var x1 = ((Math.min(self.start_drag[0], self.end_drag[0]) - width / 2) / self.scale) + self.x_center;
        var y1 = ((Math.max(self.start_drag[1], self.end_drag[1]) - height / 2) / -self.scale) + self.y_center;
        var x2 = ((Math.max(self.start_drag[0], self.end_drag[0]) - width / 2) / self.scale) + self.x_center;
        var y2 = ((Math.min(self.start_drag[1], self.end_drag[1]) - height / 2) / -self.scale) + self.y_center;
      }
      else // Pick selection ...
      {
        var width = self.element.width();
        var height = self.element.height();

        var x1 = (((e.layerX - self.options.pick_distance) - width / 2) / self.scale) + self.x_center;
        var y1 = (((e.layerY + self.options.pick_distance) - height / 2) / -self.scale) + self.y_center;
        var x2 = (((e.layerX + self.options.pick_distance) - width / 2) / self.scale) + self.x_center;
        var y2 = (((e.layerY - self.options.pick_distance) - height / 2) / -self.scale) + self.y_center;
      }

      self.start_drag = null;
      self.end_drag = null;

      var x = self.options.x;
      var y = self.options.y;
      var count = x.length;
      for(var i = 0; i != count; ++i)
      {
        if(x1 <= x[i] && x[i] <= x2 && y1 <= y[i] && y[i] <= y2)
        {
          self.options.selection.push(i);
        }
      }

      self._schedule_update(false, true);
      self.element.trigger("selection-changed", [self.options.selection]);
    });
  },

  _setOption: function(key, value)
  {
    console.log("cca.scatterplot._setOption()", key, value);
    this.options[key] = value;

    if(key == "x")
    {
      this.x_min = d3.min(this.options.x);
      this.x_max = d3.max(this.options.x);
      this.x_center = (this.x_min + this.x_max) / 2;

      this._schedule_update(true, true);
    }

    else if(key == "y")
    {
      this.y_min = d3.min(this.options.y);
      this.y_max = d3.max(this.options.y);
      this.y_center = (this.y_min + this.y_max) / 2;

      this._schedule_update(true, true);
    }

    else if(key == "v")
    {
      this.v_min = d3.min(this.options.v);
      this.v_max = d3.max(this.options.v);
      this.v_center = (this.v_min + this.v_max) / 2;
      this.options.color.domain([this.v_min, this.v_center, this.v_max]);
      //this.color = this.color_mapper.createSelectedColorMap(v_min, v_max);

      this._schedule_update(true, true);
    }

    else if(key == "selection")
    {
      this._schedule_update(false, true);
    }

/*
    if(parameters.color)
    {
      var v_min = d3.min(this.options.v);
      var v_max = d3.max(this.options.v);
      this.color = this.color_mapper.createSelectedColorMap(v_min, v_max);
    }
*/

    else if(key == "width")
    {
      this.element.attr("width", this.options.width).css("width", this.options.width);
      this.data_canvas.attr("width", this.options.width);
      this.selection_canvas.attr("width", this.options.width);

      this._schedule_update(true, true);
    }

    else if(key == "height")
    {
      this.element.attr("height", this.options.height).css("height", this.options.height);
      this.data_canvas.attr("height", this.options.height);
      this.selection_canvas.attr("height", this.options.height);

      this._schedule_update(true, true);
    }
  },

  _schedule_update: function(render_data, render_selection)
  {
    console.log("cca.scatterplot._schedule_update()");
    if(render_data)
      this.render_data = true;
    if(render_selection)
      this.render_selection = true;
    if(this.update)
      return;

    var self = this;
    this.update = window.setTimeout(function() { self._update(); }, 0);
  },

  _update: function()
  {
    console.log("cca.scatterplot._update()");
    this.update = null;

    var width = this.element.attr("width");
    var height = this.element.attr("height");
    this.scale = 0.4 * Math.min(width / (this.x_max - this.x_center), width / (this.x_center - this.x_min), height / (this.y_max - this.y_center), height / (this.y_center - this.y_min));

    if(this.render_data)
    {
      this.data_context.setTransform(1, 0, 0, 1, 0, 0);
      this.data_context.clearRect(0, 0, width, height);

      // Draw labels ...
      this.data_context.font = "10pt Arial";
      this.data_context.textAlign = "center";
      this.data_context.fillStyle = "gray";

      this.data_context.save();
      this.data_context.textBaseline = "alphabetic";
      this.data_context.translate(width / 2, height - 5);
      this.data_context.fillText("Input Metavariable", 0, 0);
      this.data_context.restore();

      this.data_context.save();
      this.data_context.textBaseline = "top";
      this.data_context.translate(5, height / 2);
      this.data_context.rotate(-Math.PI / 2);
      this.data_context.fillText("Output Metavariable", 0, 0);
      this.data_context.restore();

      this.data_context.translate(width / 2, height / 2);
      this.data_context.scale(this.scale, -this.scale);
      this.data_context.translate(-this.x_center, -this.y_center);

      var count = this.options.x.length;
      var x = this.options.x;
      var y = this.options.y;
      var v = this.options.v;

      // Draw points using circles ...
      if(count < 100000)
      {
        var radius = 2 / this.scale;
        var twopi = Math.PI * 2;
        this.data_context.stokeStyle = "black";
        this.data_context.lineWidth = 1 / this.scale;
        for(var i = 0; i != count; ++i)
        {
          this.data_context.fillStyle = this.options.color(v[i]);
          this.data_context.beginPath();
          this.data_context.arc(x[i], y[i], radius, 0, twopi);
          this.data_context.fill();
          this.data_context.stroke();
        }
      }
      // Draw points using rectangles ...
      else
      {
        var size = 2 / this.scale;
        for(var i = 0; i != count; ++i)
        {
          this.data_context.fillStyle = this.options.color(v[i]);
          this.data_context.fillRect(x[i], y[i], size, size);
        }
      }
    }

    if(this.render_selection)
    {
      var x = this.options.x;
      var y = this.options.y;
      var v = this.options.v;

      this.selection_context.setTransform(1, 0, 0, 1, 0, 0);
      this.selection_context.clearRect(0, 0, width, height);

      this.selection_context.translate(width / 2, height / 2);
      this.selection_context.scale(this.scale, -this.scale);
      this.selection_context.translate(-this.x_center, -this.y_center);

      var radius = 5 / this.scale;
      var twopi = Math.PI * 2;
      this.selection_context.strokeStyle = "black";
      this.selection_context.lineWidth = 1 / this.scale;
      for(var i in this.options.selection)
      {
        var index = this.options.selection[i];
        this.selection_context.fillStyle = this.options.color(v[index]);
        this.selection_context.beginPath();
        this.selection_context.arc(x[index], y[index], radius, 0, twopi);
        this.selection_context.fill();
        this.selection_context.stroke();
      }
    }

    if(this.render_data || this.render_selection)
    {
      this.main_context.clearRect(0, 0, width, height);
      this.main_context.drawImage(this.data_canvas.get(0), 0, 0);
      this.main_context.drawImage(this.selection_canvas.get(0), 0, 0);
    }

    this.render_selection = false;
    this.render_data = false;
  }
});

