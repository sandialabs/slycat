/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

define("slycat-linear-regression-demo-model", ["slycat-web-client", "knockout", "knockout-mapping", "d3", "URI", "domReady!"], function(client, ko, mapping, d3, URI)
{
  // Setup storage for the data we're going to plot.
  var page =
  {
    mid: ko.observable(null), // Model id.
    width: ko.observable(600), // Width of the svg canvas / d3 plot.
    height: ko.observable(600), // Height of the svg canvas / d3 plot.
    x_column: ko.observable(null), // Index of the table column containing X values.
    y_column: ko.observable(null), // Index of the table column containing Y values.
    regression: mapping.fromJS({slope:null, intercept:null, r:null, p:null, error:null}), // Regression line information.
    x: ko.observableArray(), // Array of X values.
    y: ko.observableArray(), // Array of Y values.
    render_completed: ko.observable(0), // Changes whenever the plot is rendered.
    selection: ko.observableArray(), // Array of selected point indices.
  };

  // Load data as the necessary information becomes available.
  page.load_x_column = ko.computed(function()
  {
    if(page.mid() !== null)
    {
      client.get_model_parameter(
      {
        mid: page.mid(),
        aid: "x-column",
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
        aid: "y-column",
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
        aid: "regression",
        success: function(value)
        {
          mapping.fromJS(value, page.regression);
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
        hyperchunks: "0/" + page.x_column() + "/...",
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
        hyperchunks: "0/" + page.y_column() + "/...",
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

      var svg = d3.select("svg")
        .on("click", function()
        {
          page.selection([]);
        });

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

      // Render points
      svg.selectAll(".point")
        .data(data)
      .enter().append("circle")
        .attr("class", "point")
        .attr("r", 3)
        .attr("cx", function(datum) { return x_scale(datum[0]); })
        .attr("cy", function(datum) { return y_scale(datum[1]); })
        .on("click", function(d, i)
        {
          page.selection([i]);
          d3.event.stopPropagation();
        })
        .style({"stroke":"black", "stroke-opacity":0.5, "fill":"steelblue"})
        ;

      // Notify observers that rendering is complete.
      page.render_completed(page.render_completed() + 1);
    }
  });

  // Called whenever the selection changes.
  page.selection_changed = ko.computed(function()
  {
    var render_completed = page.render_completed();
    var selection = page.selection();

    d3.selectAll(".point")
      .attr("r", function(d, i)
      {
        return selection.indexOf(i) != -1 ? 7 : 3;
      })
      .style("fill", function(d, i)
      {
        return selection.indexOf(i) != -1 ? "yellow" : "steelblue";
      })
      ;
  });

  // Miscellaneous helpers for use with HTML bindings.
  page.format = function(number, places)
  {
    return Number(number).toPrecision(places || 3);
  }

  ko.applyBindings(page, document.getElementById("slycat-linear-regression-demo"));

  // Start loading data from the model.
  page.mid(URI(window.location).segment(-1));
});

