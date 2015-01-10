/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-linear-regression-demo-model", ["slycat-web-client", "domReady!"], function(client)
{
  // Setup storage for the data we're going to plot.
  var page =
  {
    mid: ko.observable(location.pathname.split("/").reverse()[0]),
    width: ko.observable(600),
    height: ko.observable(600),
    x_column: ko.observable(null),
    y_column: ko.observable(null),
    regression: ko.mapping.fromJS({slope:null, intercept:null, r:null, p:null, error:null}),
    statistics: ko.mapping.fromJS([{min:null, max:null}, {min:null, max:null}]),
    x: ko.observableArray(),
    y: ko.observableArray(),
  };

  page.format = function(number, places)
  {
    return Number(number).toPrecision(places || 3);
  }

  page.load_x = ko.computed(function()
  {
    if(page.x_column() !== null)
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
    if(page.y_column() !== null)
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

  page.load_statistics = ko.computed(function()
  {
    if(page.x_column() !== null && page.y_column() !== null)
    {
      client.get_model_arrayset_metadata(
      {
        mid: page.mid(),
        aid: "data-table",
        statistics: [[0, page.x_column()], [0, page.y_column()]],
        success: function(metadata)
        {
          ko.mapping.fromJS(metadata.statistics, page.statistics);
        }
      });
    }
  });

  page.points = ko.pureComputed(function()
  {
    var width = page.width();
    var height = page.height();
    var min_x = page.statistics()[0].min();
    var max_x = page.statistics()[0].max();
    var min_y = page.statistics()[1].min();
    var max_y = page.statistics()[1].max();
    var x = page.x();
    var y = page.y();

    var points = [];
    if(min_x !== null && max_x !== null && min_y !== null && max_y !== null && x.length && y.length)
    {
      for(var i = 0; i != x.length; ++i)
      {
        points.push(
        {
          x: (x[i] - min_x) / (max_x - min_x) * width,
          y: height - ((y[i] - min_y) / (max_y - min_y) * height),
        });
      }
    }
    return points;
  });

  page.regression_line = ko.pureComputed(function()
  {
    var width = page.width();
    var height = page.height();
    var min_x = page.statistics()[0].min();
    var max_x = page.statistics()[0].max();
    var min_y = page.statistics()[1].min();
    var max_y = page.statistics()[1].max();
    var slope = page.regression.slope();
    var intercept = page.regression.intercept();

    var regression_line = {x1:null, y1:null, x2:null, y2:null};
    if(min_x !== null && max_x !== null && min_y !== null && max_y !== null && slope !== null && intercept !== null)
    {
      regression_line.x1 = 0;
      regression_line.x2 = width;
      regression_line.y1 = height - (((min_x * slope + intercept) - min_y) / (max_y - min_y) * height);
      regression_line.y2 = height - (((max_x * slope + intercept) - min_y) / (max_y - min_y) * height);
    }
    return regression_line;
  });

  ko.applyBindings(page, document.getElementById("slycat-linear-regression-demo"));

  // Load the model data.
  client.get_model_parameter(
  {
    mid: page.mid(),
    name: "x-column",
    success: function(value)
    {
      page.x_column(value);
    }
  });

  client.get_model_parameter(
  {
    mid: page.mid(),
    name: "y-column",
    success: function(value)
    {
      page.y_column(value);
    }
  });

  client.get_model_parameter(
  {
    mid: page.mid(),
    name: "regression",
    success: function(value)
    {
      ko.mapping.fromJS(value, page.regression);
    }
  });

});

