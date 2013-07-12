/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

function cca_scatterplot(parameters)
{ 
  this.padding = 30;
  this.x = d3.scale.linear();
  this.y = d3.scale.linear();
  this.color = d3.scale.linear();
  this.simulation_callbacks = [];
  this.value_label = null;
  this.data = []

  this.panel = d3.select(parameters.container).append("svg:svg")
    .attr("width", parameters.width)
    .attr("height", parameters.height)
    .on("click", panel_selection_callback(this))
    ;

  this.panel.append("svg:text")
    .attr("id", "input-metavariable-label")
    .attr("text-anchor", "middle")
    .text("Input Metavariable")
    ;

  this.panel
  .append("svg:g")
    .attr("id", "output-metavariable-label")
  .append("svg:text")
    .attr("transform", "rotate(270)")
    .attr("text-anchor", "middle")
    .text("Output Metavariable")
    ;

  this.panel.append("svg:g")
    .attr("id", "data-points")
    ;

  this.panel.append("svg:g")
    .attr("id", "data-selection-outline")
    ;

  this.panel.append("svg:g")
    .attr("id", "data-selection")
    ;

  function panel_selection_callback(context)
  {
    return function()
    {
      var selection = [];

      context.update({simulation_selection: selection});

      for(var i = 0; i != context.simulation_callbacks.length; ++i)
        context.simulation_callbacks[i](selection);
    }
  }

  function point_selection_callback(context)
  {
    return function(d)
    {
      var selection = [d];

      context.update({simulation_selection: selection});

      for(var i = 0; i != context.simulation_callbacks.length; ++i)
        context.simulation_callbacks[i](selection);

      d3.event.stopPropagation();
    }
  }

  this.update = function(parameters)
  {
    function title_callback(context)
    {
      return function(d)
      {
        if(context.value_label)
          return "Simulation ID: " + d + " " + context.value_label + ": " + context.data[d][2];
        else
          return "Simulation ID: " + d;
      }
    }

    if(parameters.value_label)
    {
      this.value_label = parameters.value_label;

      this.panel.selectAll("circle")
        .attr("title", title_callback(parameters.value_label))
        ;
    }

    if(parameters.data)
    {
      this.data = parameters.data;

      var x_min = pv.min(this.data, function(d) { return d[0]; });
      var x_max = pv.max(this.data, function(d) { return d[0]; });
      var y_min = pv.min(this.data, function(d) { return d[1]; });
      var y_max = pv.max(this.data, function(d) { return d[1]; });
      var v_min = pv.min(this.data, function(d) { return d[2]; });
      var v_max = pv.max(this.data, function(d) { return d[2]; });

      var x_size = x_max - x_min;
      var y_size = y_max - y_min;
      if(x_size > y_size)
      {
        y_min -= ((x_size - y_size) * 0.5)
        y_max += ((x_size - y_size) * 0.5)
      }
      else
      {
        x_min -= ((y_size - x_size) * 0.5)
        x_max += ((y_size - x_size) * 0.5)
      }

      this.x.domain([x_min, x_max]).range([this.padding, this.panel.attr("width") - this.padding]);
      this.y.domain([y_min, y_max]).range([this.panel.attr("height") - this.padding, this.padding]);
      this.color.domain([v_min, v_max]).range(["blue", "red"]);

      var x = this.x;
      var y = this.y;
      var color = this.color;
      var value_label = this.value_label;
      var data = this.data;
      var enable_animation = data.length < 5000 ? true : false;

      var dots = this.panel.select("#data-points").selectAll("circle")
        .data(d3.range(data.length))
        ;

      dots.enter().append("svg:circle")
        .classed("data", true)
//        .attr("cx", function(d) { return x(data[d][0]); })
//        .attr("cy", function(d) { return y(data[d][1]); })
//        .style("fill", function(d) { return color(data[d][2]); })
        .style("stroke", "black")
//        .attr("title", title_callback(this))
        .attr("r", 4)
        .on("click", point_selection_callback(this))
        ;

      dots.exit().remove();

      if(enable_animation)
        dots = dots.transition().duration(1000);
      dots
        .attr("cx", function(d) { return x(data[d][0]); })
        .attr("cy", function(d) { return y(data[d][1]); })
        .style("fill", function(d) { return color(data[d][2]); })
        .attr("title", title_callback(this))
        ;

      var data_selection = this.panel.select("#data-selection").selectAll("circle");
      if(enable_animation)
        data_selection = data_selection.transition().duration(1000);

      data_selection
        .attr("cx", function(d) { return x(data[d][0]); })
        .attr("cy", function(d) { return y(data[d][1]); })
        .style("fill", function(d) { return color(data[d][2]); })
        .attr("title", title_callback(this))
        ;

      var data_selection_outline = this.panel.select("#data-selection-outline").selectAll("circle");
      if(enable_animation)
        data_selection_outline = data_selection_outline.transition().duration(1000);

      data_selection_outline
        .attr("cx", function(d) { return x(data[d][0]); })
        .attr("cy", function(d) { return y(data[d][1]); })
        .attr("title", title_callback(this))
        ;
    }

    if(parameters.width)
    {
      this.panel
        .attr("width", parameters.width)
        ;

      this.x.range([this.padding, this.panel.attr("width") - this.padding]);

      var x = this.x;
      var data = this.data;

      this.panel.selectAll("circle")
        .attr("cx", function(d) { return x(data[d][0]); })
        ;
    }

    if(parameters.height)
    {
      this.panel
        .attr("height", parameters.height)
        ;

      this.y.range([this.panel.attr("height") - this.padding, this.padding]);

      var y = this.y;
      var data = this.data;

      this.panel.selectAll("circle")
        .attr("cy", function(d) { return y(data[d][1]); })
        ;
    }

    if(parameters.width || parameters.height)
    {
      this.panel.select("#input-metavariable-label")
        .attr("x", this.panel.attr("width") / 2)
        .attr("y", this.panel.attr("height") - 10)
        ;

      this.panel.select("#output-metavariable-label")
        .attr("transform", "translate(15, " + this.panel.attr("height") / 2 + ")")
        ;
    }

    if(parameters.add_simulation_callback)
      this.simulation_callbacks.push(parameters.add_simulation_callback);

    if(parameters.simulation_selection)
    {
      var x = this.x;
      var y = this.y;
      var color = this.color;
      var value_label = this.value_label;
      var data = this.data;

      var dots = this.panel.select("#data-selection").selectAll("circle")
        .data(parameters.simulation_selection)
        ;

      dots.enter().append("svg:circle")
        .attr("cx", function(d) { return x(data[d][0]); })
        .attr("cy", function(d) { return y(data[d][1]); })
        .attr("title", title_callback(this))
        .attr("r", 10)
        .style("fill", function(d) { return color(data[d][2]); })
        .style("stroke", "yellow")
        .style("stroke-width", "1.5px")
        ;

      dots
        .attr("cx", function(d) { return x(data[d][0]); })
        .attr("cy", function(d) { return y(data[d][1]); })
        .style("fill", function(d) { return color(data[d][2]); })
        .attr("title", title_callback(this))
        ;

      dots.exit().remove();

      var dots = this.panel.select("#data-selection-outline").selectAll("circle")
        .data(parameters.simulation_selection)
        ;

      dots.enter().append("svg:circle")
        .attr("cx", function(d) { return x(data[d][0]); })
        .attr("cy", function(d) { return y(data[d][1]); })
        .style("fill", "black")
        .attr("title", title_callback(this))
        .attr("r", 12)
        ;

      dots
        .attr("cx", function(d) { return x(data[d][0]); })
        .attr("cy", function(d) { return y(data[d][1]); })
        .attr("title", title_callback(this))
        ;

      dots.exit().remove();
    }
  }

  this.update(parameters);
}

