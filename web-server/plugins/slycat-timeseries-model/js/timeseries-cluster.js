/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

///////////////////////////////////////////////////////////////////////////////////////////
// HTML5 DOM cluster control, for use with the timeseries model.

$.widget("timeseries.cluster",
{
  options:
  {
  	clusters:[],
  	cluster: 0,
  },

  _create: function()
  {
  	var self = this;

  	this.select_cluster = function(cluster)
    {
      this.element.find("td.selected").removeClass("selected");
      this.element.find("td:eq(" + cluster + ")").addClass("selected");
    }

    function click_cluster(context, cluster)
    {
      return function()
      {
        context.select_cluster(cluster);
        self.options.cluster = cluster;
        context.element.trigger("cluster-changed", cluster);
      }
    }

  	var clusters = this.options.clusters;
    var cluster = this.options.cluster;

    var row = $("<tr>").appendTo($("<thead>").appendTo(this.element));
    $("<th>").text("Outputs:").appendTo(row);
    $.each(clusters, function(index, name)
    {
      $("<td>")
        .addClass("output")
        .appendTo(row)
        .data("name", name)
        .data("self", self)
        .data("index", index)
        .text(name)
        .click(click_cluster(self, index))
        ;
    });

    // Setup the default selected cluster ...
    this.select_cluster(this.options.cluster);
  },

});