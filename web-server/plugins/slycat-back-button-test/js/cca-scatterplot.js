/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

define("slycat-cca-scatterplot", ["d3"], function(d3)
{
  $.widget("cca.scatterplot",
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
      selection : [],
      color : d3.scale.linear().domain([-1, 0, 1]).range(["blue", "white", "red"]),
      border : 25,
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

      this.updates = {};
      this.update_timer = null;
      this._schedule_update({update_indices:true, update_width:true, update_height:true, update_x:true, update_y:true, update_color_domain:true, render_data:true, render_selection:true});

      var self = this;

      this.element.mousedown(function(e)
      {
        self.start_drag = [self._offsetX(e), self._offsetY(e)];
        self.end_drag = null;
      });

      this.element.mousemove(function(e)
      {
        if(self.start_drag) // Mouse is down ...
        {
          if(self.end_drag) // Already dragging ...
          {
            self.end_drag = [self._offsetX(e), self._offsetY(e)];

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
            if(Math.abs(self._offsetX(e) - self.start_drag[0]) > self.options.drag_threshold || Math.abs(self._offsetY(e) - self.start_drag[1]) > self.options.drag_threshold) // Start dragging ...
            {
              self.end_drag = [self._offsetX(e), self._offsetY(e)];
            }
          }
        }
      });

      this.element.mouseup(function(e)
      {
        if(!e.ctrlKey && !e.metaKey)
          self.options.selection = [];

        var x = self.options.x;
        var y = self.options.y;
        var count = x.length;

        if(self.start_drag && self.end_drag) // Rubber-band selection ...
        {
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
          var x1 = self.x_scale.invert(self._offsetX(e) - self.options.pick_distance);
          var y1 = self.y_scale.invert(self._offsetY(e) + self.options.pick_distance);
          var x2 = self.x_scale.invert(self._offsetX(e) + self.options.pick_distance);
          var y2 = self.y_scale.invert(self._offsetY(e) - self.options.pick_distance);

          for(var i = 0; i != count; ++i)
          {
            if(x1 <= x[i] && x[i] <= x2 && y1 <= y[i] && y[i] <= y2)
            {
              var index = self.options.selection.indexOf(self.options.indices[i]);
              if(index == -1)
                self.options.selection.push(self.options.indices[i]);
              else
                self.options.selection.splice(index, 1);

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

    _offsetX: function(e)
    {
      return e.pageX - e.currentTarget.getBoundingClientRect().left - $(document).scrollLeft();
    },

    _offsetY: function(e)
    {
      return e.pageY - e.currentTarget.getBoundingClientRect().top - $(document).scrollTop();
    },

    _setOption: function(key, value)
    {
      //console.log("cca.scatterplot._setOption()", key, value);
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
      {
        if(updates[key] == true)
          this.updates[key] = true
      }

      if(this.update_timer)
        return;

      var self = this;
      this.update_timer = window.setTimeout(function() { self._update(); }, 0);
    },

    _update: function()
    {
      //console.log("cca.scatterplot._update()", this.updates);
      this.update_timer = null;

      if(this.updates["update_width"])
      {
        this.element.attr("width", this.options.width).css("width", this.options.width);
        this.data_canvas.attr("width", this.options.width);
        this.selection_canvas.attr("width", this.options.width);
      }

      if(this.updates["update_height"])
      {
        this.element.attr("height", this.options.height).css("height", this.options.height);
        this.data_canvas.attr("height", this.options.height);
        this.selection_canvas.attr("height", this.options.height);
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
        this.data_context.setTransform(1, 0, 0, 1, 0, 0);
        this.data_context.clearRect(0, 0, width, height);

        // Draw labels ...
        this.data_context.font = "10pt Arial";
        this.data_context.textAlign = "center";
        this.data_context.fillStyle = "black";

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

        var count = this.options.x.length;
        var x = this.options.x;
        var y = this.options.y;
        var v = this.options.v;
        var indices = this.options.indices;
        var color = this.options.color;

        // Draw points using circles ...
        if(count < 100000)
        {
          var radius = 4;
          var twopi = Math.PI * 2;
          this.data_context.stokeStyle = "black";
          this.data_context.lineWidth = 1;
          for(var i = 0; i != count; ++i)
          {
            this.data_context.fillStyle = color(v[indices[i]]);
            this.data_context.beginPath();
            this.data_context.arc(this.x_scale(x[i]), this.y_scale(y[i]), radius, 0, twopi);
            this.data_context.fill();
            this.data_context.stroke();
          }
        }
        // Draw points using rectangles ...
        else
        {
          var size = 2;
          var offset = size / 2;
          for(var i = 0; i != count; ++i)
          {
            this.data_context.fillStyle = color(v[indices[i]]);
            this.data_context.fillRect(this.x_scale(x[i]) - offset, this.y_scale(y[i]) - offset, size, size);
          }
        }
      }

      if(this.updates["render_selection"])
      {
        var x = this.options.x;
        var y = this.options.y;
        var v = this.options.v;
        var color = this.options.color;
        var indices = this.options.indices;

        this.selection_context.setTransform(1, 0, 0, 1, 0, 0);
        this.selection_context.clearRect(0, 0, width, height);

        var radius = 8;
        var twopi = Math.PI * 2;
        this.selection_context.strokeStyle = "black";
        this.selection_context.lineWidth = 1;

        var selection = this.options.selection;
        var selection_count = selection.length;
        for(var i = 0; i != selection_count; ++i)
        {
          var global_index = selection[i];
          var local_index = this.inverse_indices[global_index];
          this.selection_context.fillStyle = color(v[global_index]);
          this.selection_context.beginPath();
          this.selection_context.arc(this.x_scale(x[local_index]), this.y_scale(y[local_index]), radius, 0, twopi);
          this.selection_context.fill();
          this.selection_context.stroke();
        }
      }

      if(this.updates["render_data"] || this.updates["render_selection"])
      {
        this.main_context.clearRect(0, 0, width, height);
        this.main_context.drawImage(this.data_canvas.get(0), 0, 0);
        this.main_context.drawImage(this.selection_canvas.get(0), 0, 0);
      }

      this.updates = {}
    }
  });

});
