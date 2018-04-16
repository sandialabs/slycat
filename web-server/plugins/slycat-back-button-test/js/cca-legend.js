/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

define("slycat-cca-legend", ["d3"], function(d3)
{
  $.widget("cca.legend",
  {
    options:
    {
      width: 300,
      height: 300,
      metadata : null,
      label : "Label",
      min : null,
      max : null,
      border : 25,
    },

    _create: function()
    {
      var self = this;

      // Setup the legend ...
      self.svg = d3.select(self.element.get(0)).append("svg");
      self.legend_layer = self.svg.append("g").attr("class", "legend");
      self.legend_axis_layer = self.legend_layer.append("g").attr("class", "legend-axis");

      self.updates = {};
      self.update_timer = null;

      self._schedule_update({
        update_width:true,
        update_height:true,
        render_legend:true,
        update_legend_colors:true,
        update_legend_position:true,
        update_legend_axis:true,
        update_label:true,
      });

    },

    _setOption: function(key, value)
    {
      var self = this;

      //console.log("cca.legend._setOption()", key, value);
      this.options[key] = value;

      if(key == "v")
      {
        self._schedule_update({update_color_domain:true, render_data:true, render_selection:true, update_legend_axis:true});
      }

      else if(key == "width")
      {
        self._schedule_update({update_width:true, });
      }

      else if(key == "height")
      {
        self._schedule_update({update_height:true, update_legend_position:true, update_legend_axis:true, update_label:true,});
      }

      else if(key == "gradient")
      {
        self._schedule_update({update_legend_colors:true, });
      }

      else if(key == "min" || key == "max")
      {
        self._schedule_update({update_legend_axis:true, });
      }

      else if(key == "label")
      {
        self._schedule_update({update_label:true, })
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

      //console.log("cca.legend._update()", self.updates);
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
        var total_width = self.element.width();
        var total_height = self.element.height();
        var rectHeight = parseInt(total_height - (self.options.border * 2));

        var transx = self.options.border + 28; // 28 is height of label
        var transy = self.options.border;
         self.legend_layer
          .attr("transform", "translate(" + transx + "," + transy + ")")
          .attr("data-transx", transx)
          .attr("data-transy", transy)
          ;

        self.legend_layer.select("rect.color")
          .attr("height", rectHeight)
          ;
      }

      if(self.updates["update_legend_axis"])
      {
        self.legend_scale = d3.scale.linear().domain([self.options.max, self.options.min]).range([0, parseInt(self.legend_layer.select("rect.color").attr("height"))]);
        self.legend_axis = d3.svg.axis().scale(self.legend_scale).orient("right");
        self.legend_axis_layer
          .attr("transform", "translate(" + (parseInt(self.legend_layer.select("rect.color").attr("width")) + 1) + ",0)")
          .call(self.legend_axis)
          ;

        // Need to re-assign fill style to get around this firefox bug: https://bugzilla.mozilla.org/show_bug.cgi?id=652991
        // It only seems to affect fill gradients and only when the URI changes, like it does for us with bookmarking.
        var colorbar = self.legend_layer.select("rect.color")
          .style("fill", "url(#color-gradient)")
          ;
      }

      if(self.updates["update_label"])
      {
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
          .text(self.options.label)
          ;
      }

      self.updates = {}
    },
  });

});
