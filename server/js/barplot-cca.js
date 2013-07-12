/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

function cca_barplot(parameters)
{
  var width = parameters.width;
  var height = parameters.height;
  var label_height = 40;

/*
  var labels = ["a", "b", "c", "d", "e", "f"];
  var data = [[-1, 1], [2.23456, 3], [4.000000006, -5], [0.25, -1], [-0.1, 2], [6, 3]];
  var component = 0;
*/

  var labels = parameters.labels;
  var data = parameters.data;
  var component = parameters.component;

  this.chart = d3.select(parameters.canvas).append("svg:svg")
    .attr("width", width)
    .attr("height", width)
    ;

  bar_left = d3.scale.linear()
    .domain([0, labels.length])
    .range([0, width])
    ;

  abs_max = d3.max(data, function(d) { return Math.abs(d[component]); });

  bar_height = d3.scale.linear()
    .domain([0, abs_max])
    .range([0, (height - label_height) / 2])
    ;

  positive_bar_top = d3.scale.linear()
    .domain([0, abs_max])
    .range([(height / 2) - (label_height / 2), 0])
    ;

  function transition_bar_top(height, label_height, positive_bar_top, component)
  {
    return function(d, i)
    {
      return d[component] < 0 ? (height / 2) + (label_height / 2) : positive_bar_top(d[component]);
    }
  }

  function transition_bar_height(bar_height, component)
  {
    return function(d, i)
    {
      return bar_height(Math.abs(d[component]));
    }
  }

  function fade_bars(chart, opacity)
  {
    return function(d, i)
    {
      chart.selectAll("rect.bar").filter(function(d2, i2) { return i != i2; })
        .transition()
          .attr("opacity", opacity)
        ;
    }
  }

  function select_bar(chart)
  {
    return function(d, i)
    {
      chart.selectAll("rect.bar")
        .classed("selected", false);
      chart.selectAll("rect.bar").filter(function(d2, i2) { return i == i2; })
        .classed("selected", true);
    }
  }

  // Create bars ...
  this.chart.selectAll("rect.bar")
    .data(data)
  .enter().append("svg:rect")
    .attr("x", function(d, i) { return bar_left(i) + 1; })
    .attr("y", function(d) { return d[component] < 0 ? (height / 2) + (label_height / 2) : (height / 2) - (label_height / 2); })
    .attr("width", (width / data.length) - 2)
    .attr("height", 0)
    .classed("bar", true)
    .classed("negative", function(d) { return d[component] < 0; })
    .classed("positive", function(d) { return d[component] >= 0; })
    .attr("title", function(d, i) { return labels[i] + ": " + d[component]; })
    .on("mouseover", fade_bars(this.chart, 0.3))
    .on("mouseout", fade_bars(this.chart, 1.0))
    .on("click", select_bar(this.chart))
  .transition()
    .duration(1000)
    .attr("y", transition_bar_top(height, label_height, positive_bar_top, component))
    .attr("height", transition_bar_height(bar_height, component))
    ;

  // Create labels ...
  this.chart.selectAll("rect.label")
    .data(labels)
  .enter().append("svg:rect")
    .attr("x", function(d, i) { return bar_left(i) + 1; })
    .attr("y", (height / 2) - (label_height / 2))
    .attr("width", (width / data.length) - 2)
    .attr("height", label_height)
    .classed("label", true)
    .attr("title", function(d, i) { return labels[i] + ": " + data[i][component]; })
    ;

  this.chart.selectAll("text.label")
    .data(labels)
  .enter().append("svg:text")
    .attr("x", function(d, i) { return (bar_left(i) + bar_left(i + 1)) / 2; })
    .attr("y", function(d) { return (height / 2) - (label_height / 4); })
    .attr("text-anchor", "middle")
    .attr("dy", ".25em")
    .attr("opacity", 0)
    .text(String)
    .classed("label", true)
    .classed("negative", function(d) { return d[component] < 0; })
    .classed("positive", function(d) { return d[component] >= 0; })
  .transition()
    .duration(1000)
    .attr("opacity", 1)
    ;

  this.chart.selectAll("text.label.value")
    .data(data)
  .enter().append("svg:text")
    .attr("x", function(d, i) { return (bar_left(i) + bar_left(i + 1)) / 2; })
    .attr("y", function(d) { return (height / 2) + (label_height / 4); })
    .attr("text-anchor", "middle")
    .attr("dy", ".35em")
    .attr("opacity", 0)
    .text(function(d) { return d3.round(d[component], 3); })
    .classed("label", true)
    .classed("value", true)
    .classed("negative", function(d) { return d[component] < 0; })
    .classed("positive", function(d) { return d[component] >= 0; })
  .transition()
    .duration(1000)
    .attr("opacity", 1)
    ;

  this.update = function(parameters)
  {
    if(parameters.width)
    {
      this.chart
        .attr("width", parameters.width)
        ;

      bar_left = d3.scale.linear()
        .domain([0, labels.length])
        .range([0, parameters.width])
        ;

      this.chart.selectAll("rect.bar")
        .attr("x", function(d, i) { return bar_left(i) + 1; })
        .attr("width", (parameters.width / data.length) - 2)
        ;

      // Create labels ...
      this.chart.selectAll("rect.label")
        .attr("x", function(d, i) { return bar_left(i) + 1; })
        .attr("width", (parameters.width / data.length) - 2)
        ;

      this.chart.selectAll("text.label")
        .attr("x", function(d, i) { return (bar_left(i) + bar_left(i + 1)) / 2; })
        ;

      this.chart.selectAll("text.label.value")
        .attr("x", function(d, i) { return (bar_left(i) + bar_left(i + 1)) / 2; })
        ;
    }

    if(parameters.height)
    {
      this.chart
        .attr("height", parameters.height)
        ;

    }
/*
    this.abs_max = d3.max(data, function(d) { return Math.abs(d[component]); });

    bar_height = d3.scale.linear()
      .domain([0, this.abs_max])
      .range([0, (height - label_height) / 2])
      ;

    positive_bar_top = d3.scale.linear()
      .domain([0, this.abs_max])
      .range([(height / 2) - (label_height / 2), 0])
      ;

    this.chart.selectAll("rect.bar")
      .attr("title", function(d, i) { return labels[i] + ": " + d[component]; })
      .classed("negative", function(d) { return d[component] < 0; })
      .classed("positive", function(d) { return d[component] >= 0; })
    .transition()
      .duration(1000)
      .attr("y", function(d) { return d[component] < 0 ? (height / 2) + (label_height / 2) : positive_bar_top(d[component]); })
      .attr("height", function(d) { return bar_height(Math.abs(d[component])); })
      ;

    this.chart.selectAll("text.label.value")
      .text(function(d) { return d3.round(d[component], 3); })
      .classed("negative", function(d) { return d[component] < 0; })
      .classed("positive", function(d) { return d[component] >= 0; })
      ;
*/
  }
}
