/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define("Table", ["slycat-server-root", "slycat-web-client"], function(server_root, client) {

  function Table(model, grid) {
    console.debug("Setup table");
    this.model = model;
    this.grid = grid;
    this.statistics = null;
    this.ready = false;
  };

  Table.prototype.setup = function() {
    console.debug("inside TABLE setup()");
    // TODO what do we do here with the x and y index ??
    // TODO - for now using the first plot
    // TODO - can this be decoupled?
    // this means we are still good for parameter image
    var self = this;
    var plot = self.grid.plots[0];
    var x_index = plot.x_index;
    var y_index = plot.y_index;
    var v_index = plot.v_index;
    var images_index = plot.images_index;
    var selected_simulations = plot.selected_simulations;
    var hidden_simulations = plot.hidden_simulations;
    if(!this.ready && this.model.metadata && (this.statistics.length == this.model.metadata["column-count"])
       && this.model.bookmark && (x_index != null) && (y_index != null) && (images_index != null)
       && (selected_simulations != null) && (hidden_simulations != null) ) {
      this.ready = true;

      $("#table-pane .load-status").css("display", "none");

      var other_columns = [];
      for(var i = 0; i != self.model.metadata["column-count"] - 1; ++i) {
        if($.inArray(i, self.model.input_columns) == -1 && $.inArray(i, self.model.output_columns) == -1
           && $.inArray(i, self.model.rating_columns) == -1 && $.inArray(i, self.model.category_columns) == -1) {
          other_columns.push(i);
        }
      }

      var table_options = {
        "server-root" : server_root,
        mid : self.model.id,
        aid : "data-table",
        metadata : self.model.metadata,
        statistics : self.statistics,
        inputs : self.model.input_columns,
        outputs : self.model.output_columns,
        others : other_columns,
        images : self.model.image_columns,
        ratings : self.model.rating_columns,
        categories : self.model.category_columns,
        "image-variable" : images_index,
        "x-variable" : x_index,
        "y-variable" : y_index,
        "row-selection" : selected_simulations,
        hidden_simulations : hidden_simulations
      };

      var colormap = self.model.bookmark["colormap"] !== undefined ? self.model.bookmark["colormap"] : "night";
      table_options.colormap = $("#color-switcher").colorswitcher("get_color_map", colormap);

      if("sort-variable" in self.model.bookmark && "sort-order" in self.model.bookmark) {
        table_options["sort-variable"] = self.model.bookmark["sort-variable"];
        table_options["sort-order"] = self.model.bookmark["sort-order"];
      }

      if("variable-selection" in self.model.bookmark) {
        table_options["variable-selection"] = [self.model.bookmark["variable-selection"]];
      }
      else {
        table_options["variable-selection"] = [self.model.metadata["column-count"] - 1];
      }

      $("#table").table(table_options);

      // Log changes to the table sort order ...
      $("#table").bind("variable-sort-changed", function(event, variable, order) {
        self.variable_sort_changed(variable, order);
      });

      /* TODO: implement the table controls to sync with a 'selected plot'
       // Log changes to the x variable ...
       $("#table").bind("x-selection-changed", function(event, variable) {
       plot.x_selection_changed(variable);
       });

       // Log changes to the y variable ...
       $("#table").bind("y-selection-changed", function(event, variable) {
       plot.y_selection_changed(variable);
       });

       // Log changes to the images variable ...
       $("#table").bind("images-selection-changed", function(event, variable) {
       plot.images_selection_changed(variable);
       });

       // Log changes to the table variable selection ...
       // column selection in table
       $("#table").bind("variable-selection-changed", function(event, selection) {
       plot.selected_variable_changed(selection[0]);
       });
       */

      // Log changes to the table row selection ...
      $("#table").bind("row-selection-changed", function(event, selection) {
        // The table selection is an array buffer which can't be
        // serialized as JSON, so convert it to an array.
        var temp = [];
        for(var i = 0; i != selection.length; ++i)
          temp.push(selection[i]);
        plot.selected_simulations_changed(temp);
        $(".scatterplot").scatterplot("option", "selection",  temp);
      });

      // Changing the colormap updates the table ...
      $("#color-switcher").bind("colormap-changed", function(event, colormap) {
        $("#table").table("option", "colormap", $("#color-switcher").colorswitcher("get_color_map", colormap));
      });
      /* TODO: implement the table controls to sync with a 'selected plot'
       // Changing the table variable updates the scatterplot ...
       $("#table").bind("variable-selection-changed", function(event, selection) {
       plot.update_value(selection[0]);
       });
       */
      // Changing the scatterplot selection updates the table row selection and controls ..
      $(".scatterplot").bind("selection-changed", function(event, selection) {
        var temp = [];
        for(var i = 0; i != selection.length; ++i)
          temp.push(selection[i]);
        $("#table").table("option", "row-selection", selection);
        $(".scatterplot").scatterplot("option", "selection",  temp);
      });
      /*
       // Changing the x variable updates the table ...
       $(plot.plot_ref + " .controls").bind("x-selection-changed", function(event, variable) {

       $("#table").table("option", "x-variable", variable);
       });

       // Changing the y variable updates the table ...
       $(plot.plot_ref + " .controls").bind("y-selection-changed", function(event, variable) {
       $("#table").table("option", "y-variable", variable);
       });

       // Changing the image variable updates the table ...
       $(plot.plot_ref + " .controls").bind("images-selection-changed", function(event, variable) {
       $("#table").table("option", "image-variable", variable);
       });

       // Changing the color variable updates the table ...
       $(plot.plot_ref + " .controls").bind("color-selection-changed", function(event, variable) {
       $("#table").table("option", "variable-selection", [Number(variable)]);
       });
       */
    }
  };

  Table.prototype.load_statistics = function(columns, callback, callback_obj) {
    // TODO what's going on with callback in terms of OO?
    // the callback does not contain the same context as "this" here does
    var self = this;
    console.debug(this);
    console.debug("inside load table statistics");

    client.get_model_arrayset_metadata(
    {
      mid: self.model.id,
      aid: "data-table",
      statistics: "0/" + columns.join("|"),
      success: function(metadata)
      {
        var statistics = metadata.statistics;
        for(var i = 0; i != statistics.length; ++i)
          self.statistics[statistics[i].attribute] = {min: statistics[i].min, max: statistics[i].max};
        callback.call(callback_obj || self);
      }
    });
  };

  Table.prototype.variable_sort_changed = function(variable, order) {
    console.debug("inside variable_sort_changed()");
    console.debug("variable sort changed -- ajax");
    var self = this;
    $.ajax({
      type : "POST",
      url : server_root + "events/models/" + self.model.id + "/select/sort-order/" + variable + "/" + order
    });
    self.model.bookmarker.updateState( {"sort-variable" : variable, "sort-order" : order} );
  };

  Table.prototype.select_rows = function(rows){
    $(".scatterplot").scatterplot("option", "selection",  rows);
    $("#table").table("option", "row-selection", rows);
  };

  return Table;
});
