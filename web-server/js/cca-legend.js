/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

$.widget("cca.legend",
{
  options:
  {
    metadata : null,
    label : "Label",
    min : null,
    max : null,
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
      update_v_label:true,
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

    else if(key == "height")
    {
      self._schedule_update({update_height:true, update_legend_position:true, update_legend_axis:true, update_v_label:true,});
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
      self.legend_scale = d3.scale.linear().domain([d3.min(self.options.v), d3.max(self.options.v)]).range([0, parseInt(self.legend_layer.select("rect.color").attr("height"))]);
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

      // var y_axis_width = self.y_axis_layer.node().getBBox().width;
      // var x = -(y_axis_width+15);
      // var y = self.svg.attr("height") / 2;
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

});
