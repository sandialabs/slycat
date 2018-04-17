/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define("Model", ["slycat-server-root", "slycat-dialog", "Movie", "slycat-bookmark-manager", "d3"], function(server_root, dialog, Movie, bookmark_manager, d3) {
  //TODO: Refactor. This should be a singleton.
  function Model(login) {
    this.id = null;
    this.bookmarker = null;
    this.bookmark = null;
    this.metadata = null;
    this.indices = null;
    this.input_columns = null;
    this.output_columns = null;
    this.image_columns = null;
    this.rating_columns = null;
    this.category_columns = null;
    this.loaded_images = [];
    this.loaded_data = [];
    this.login = login;
  }

  function artifact_missing() {
    console.debug("Inside artifact_missing()");
    $(".load-status").css("display", "none");

    dialog.dialog(
    {
      title: "Load Error",
      message: "Oops, there was a problem retrieving data from the model. This likely means that there was a problem during computation.",
    });
  }

  // passing layout & table here instead of untangling the current mess of global vars and mutual dependencies is absolutely technical debt,
  // but for now aiming for the minimum set of changes required to migrate tracer-image to the plugin world
  Model.prototype.load = function(layout, table, grid) {
    console.debug("LOAD THE MODEL 1 -- ajax");
    var self = this;
    this.movie = new Movie(this, table);

    $.ajax({
      type : "GET",
      url : server_root + "models/" + location.pathname.split("/").reverse()[0] /* model ID */,
      success : function(result) {
        self.id = result._id;
        self.bookmarker = bookmark_manager.create(result.project, result._id);
        self.input_columns = result["artifact:input-columns"];
        self.output_columns = result["artifact:output-columns"];
        self.image_columns = result["artifact:image-columns"];
        self.rating_columns = result["artifact:rating-columns"] == undefined ? [] : result["artifact:rating-columns"];
        self.category_columns = result["artifact:category-columns"] == undefined ? [] : result["artifact:category-columns"];
        self.state = result["state"];
        self.result = result["result"];
        self.loaded(layout, table, grid);
      },
      error: function(request, status, reason_phrase) {
        window.alert("Error retrieving model: " + reason_phrase);
      }
    });
  };

  Model.prototype.get_numeric_variables = function() {
    var self = this;
    var numeric_variables = [];
    for(var i = 0; i < self.metadata["column-count"]-1; i++) {
      // only use non-string columns that are not used for ratings or categories
      if(self.metadata["column-types"][i] != 'string' && self.rating_columns.indexOf(i) == -1 && self.category_columns.indexOf(i) == -1) {
        numeric_variables.push(i);
      }
    }
    return numeric_variables;
  };

  //////////////////////////////////////////////////////////////////////////////////////////
  // Once the model has been loaded, retrieve metadata / bookmarked state
  //////////////////////////////////////////////////////////////////////////////////////////

  Model.prototype.loaded = function(layout, table, grid) {
    var self = this;

    console.debug("Inside model_loaded()");
    // If the model isn't ready or failed, we're done.
    if(self["state"] == "waiting" || self["state"] == "running")
      return;
    if(self["state"] == "closed" && self["result"] === null)
      return;
    if(self["result"] == "failed")
      return;

    // Display progress as the load happens ...
    $(".load-status").text("Loading data.");

    console.debug("Inside model laoded - load table metadata 1 -- ajax");
    // Load data table metadata.
    $.ajax({
      url : server_root + "models/" + self.id + "/tables/data-table/arrays/0/metadata?index=Index",
      contentType : "application/json",
      success: function(metadata) {
        self.metadata = metadata;
        table.statistics = new Array(metadata["column-count"]);
        table.statistics[metadata["column-count"]-1] = {"max": metadata["row-count"]-1, "min": 0};
        console.debug("about to call metadata_loaded ....");
        console.debug("context is : ");
        console.debug(self);
        table.load_statistics(d3.range(self.metadata["column-count"]-1), self.metadata_loaded(grid, table), self);
      },
      error: artifact_missing
    });

    // TODO integrate into callbacks
    // Retrieve bookmarked state information ...
    self.bookmarker.getState(function(state) {
      self.bookmark = state;
      layout.setup_colorswitcher();
      //self.metadata_loaded();
    });
  };

  Model.prototype.metadata_loaded = function(grid, table) {
    var self = this;
    return (function() {
      console.debug("inside metadata loaded()");

      if(!self.indices && self.metadata) {
        var count = self.metadata["row-count"];
        self.indices = new Int32Array(count);
        for(var i = 0; i != count; ++i)
          self.indices[i] = i;
      }

      if(self.metadata && self.bookmark) {
        grid.plots.forEach(function(plot) {
          var grid_calls = [];
          plot.setup_labels();
          plot.setup_simulations();

          grid_calls.push(plot.update_axis(plot.x_index, "x"));
          grid_calls.push(plot.update_axis(plot.y_index, "y"));

          plot.v_index = self.metadata["column-count"] - 1;
          if("variable-selection" in self.bookmark) {
            plot.v_index = Number(self.bookmark["variable-selection"]);
          }

          if(plot.v_index == self.metadata["column-count"] - 1) {
            var count = self.metadata["row-count"];
            plot.v = new Float64Array(count);
            for(var i = 0; i != count; ++i)
              plot.v[i] = i;
          }
          else {
            grid_calls.push(plot.update_axis(plot.v_index, "v"));
          }

          plot.images_index = self.bookmark["images-selection-" + plot.plot_id] || self.image_columns[0];
          table.setup();
          console.debug("GET models/id/arraysets/data-table/arrays/0/attrs -- ajax");
          grid_calls.push($.ajax({
            type : "GET",
            url : server_root + "models/" + self.id + "/arraysets/data-table/arrays/0/attributes/"
              + plot.images_index + "/chunk?ranges=0," + self.metadata["row-count"],
            success : function(result) {
              plot.images = plot.images || result;
            },
            error: artifact_missing
          }));
          $.when.apply(self, grid_calls).done(function(){plot.setup.apply(plot)});
        });
        table.setup(); //TODO: decouple this from scatterplot - currently dependent
      }
    });
  };

  Model.prototype.get_data_column = function(index, success_callback) {
    return this.get_column("loaded_data", index, success_callback || function(){});
  }

  Model.prototype.get_image_column = function(index, success_callback) {
    var self = this;
    $.ajax({
      type : "GET",
      //url : server_root + "models/" + self.id + "/arraysets/data-table/arrays/0/attributes/" + index + "/chunk?ranges=0," + self.metadata["row-count"],//this is the old way of doing it
      url : server_root + "models/" + self.id + "/arraysets/data-table/data?hyperchunks=0/" + index + "/ranges=0:" + self.metadata["row-count"],
      success: success_callback,
      error: artifact_missing
    });
  }

  Model.prototype.get_image = function(column_index, image_index_range, success_callback){
    return this.get_item("loaded_images", column_index, image_index_range, success_callback || function(){});
  }

  Model.prototype.get_column = function(data_store, index, success_callback) {
    var self = this;
    var on_complete = function(result) {
      success_callback(result);
      self[data_store][index].resolve(result);
    };

    if(this[data_store][index]) {
      return this[data_store][index].done(on_complete);
    }

    return this[data_store][index] = get_model_array_attribute({
      server_root : server_root,
      mid : self.id,
      aid : "data-table",
      array : 0,
      attribute : index,
      success : function(result) {
        on_complete(result);
      },
      error : artifact_missing
    });
  };
  return Model;
});
