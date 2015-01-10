/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-linear-regression-demo-model", ["slycat-web-client", "d3", "domReady!"], function(client, d3)
{
  // Setup storage for the data we're going to plot.
  var page =
  {
    mid: ko.observable(null),
    width: ko.observable(600),
    height: ko.observable(600),
    x_column: ko.observable(null),
    y_column: ko.observable(null),
    regression: ko.mapping.fromJS({slope:null, intercept:null, r:null, p:null, error:null}),
    x: ko.observableArray(),
    y: ko.observableArray(),
  };

  // Load data as the necessary information becomes available.
  page.load_x_column = ko.computed(function()
  {
    if(page.mid() !== null)
    {
      client.get_model_parameter(
      {
        mid: page.mid(),
        name: "x-column",
        success: function(value)
        {
          page.x_column(value);
        }
      });
    }
  });

  page.load_y_column = ko.computed(function()
  {
    if(page.mid() !== null)
    {
      client.get_model_parameter(
      {
        mid: page.mid(),
        name: "y-column",
        success: function(value)
        {
          page.y_column(value);
        }
      });
    }
  });

  page.load_regression = ko.computed(function()
  {
    if(page.mid() !== null)
    {
      client.get_model_parameter(
      {
        mid: page.mid(),
        name: "regression",
        success: function(value)
        {
          ko.mapping.fromJS(value, page.regression);
        }
      });
    }
  });

  page.load_x = ko.computed(function()
  {
    if(page.mid() !== null && page.x_column() !== null)
    {
      client.get_model_arrayset_data(
      {
        mid: page.mid(),
        aid: "data-table",
        hyperchunks: [[0, page.x_column()]],
        success: function(data)
        {
          page.x(data[0]);
        }
      });
    }
  });

  page.load_y = ko.computed(function()
  {
    if(page.mid() !== null && page.y_column() !== null)
    {
      client.get_model_arrayset_data(
      {
        mid: page.mid(),
        aid: "data-table",
        hyperchunks: [[0, page.y_column()]],
        success: function(data)
        {
          page.y(data[0]);
        }
      });
    };
  });

  // Render the plot once all the necessary data is loaded.
  page.render = ko.computed(function()
  {
    var x = page.x();
    var y = page.y();
    var slope = page.regression.slope();
    var intercept = page.regression.intercept();

    if(x.length && y.length && slope !== null && intercept !== null)
    {
      var padding = 10;
      var min_x = d3.min(x);
      var max_x = d3.max(x);
      var min_y = d3.min(y);
      var max_y = d3.max(y);
      var x_scale = d3.scale.linear().domain([min_x, max_x]).range([padding, page.width() - padding]);
      var y_scale = d3.scale.linear().domain([min_y, max_y]).range([page.height() - padding, padding]);
      var data = d3.zip(x, y);

      var svg = d3.select("svg");

      // Render points
      svg.selectAll(".point")
        .data(data)
      .enter().append("circle")
        .attr("class", "point")
        .attr("r", 3)
        .attr("cx", function(datum) { return x_scale(datum[0]); })
        .attr("cy", function(datum) { return y_scale(datum[1]); })
        .style({"stroke":"black", "stroke-opacity":0.5, "fill":"steelblue"})
        ;

      // Render the regression line
      svg.selectAll(".regression")
        .data([null])
      .enter().append("line")
        .attr("class", "regression")
        .attr("x1", x_scale(min_x))
        .attr("x2", x_scale(max_x))
        .attr("y1", y_scale(min_x * slope + intercept))
        .attr("y2", y_scale(max_x * slope + intercept))
        .style({"stroke":"red"})
        ;
    }
  });

  // Miscellaneous helpers for use with HTML bindings.
  page.format = function(number, places)
  {
    return Number(number).toPrecision(places || 3);
  }

  ko.applyBindings(page, document.getElementById("slycat-linear-regression-demo"));

  // Start loading data from the model.
  page.mid(location.pathname.split("/").reverse()[0]);
});

