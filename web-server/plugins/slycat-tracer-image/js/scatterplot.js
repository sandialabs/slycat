/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define("ScatterPlot", ["slycat-server-root", "d3", "SelectorBrush"], function(server_root, d3, SelectorBrush) {

  function ScatterPlot(plot_id, grid_ref, scalar, grid_obj) {
    console.log("Setup scatter plot");

    this.grid_ref = grid_ref; // DOM for parent
    this.plot_id = plot_id;
    this.plot_ref = "#" + plot_id;  // DOM plot ref
    this.scatterplot_obj = null;
    this.grid_obj = grid_obj;
    this.model = grid_obj.model;
    this.login = grid_obj.login;

    this.x_index = null;
    this.y_index = null;
    this.v_index = null;
    this.images_index = null;
    this.x = null;
    this.y = null;
    this.v = null;
    this.images = null;
    this.selected_simulations = null;
    this.hidden_simulations = null;

    this.ready = false;

    this.image_uri = document.createElement("a");

    this.scalar = scalar || {x:1, y:1};
    this.setup_dom();
  }

  ScatterPlot.prototype.show = function() {
    this.scatterplot_obj.show();
  };

  ScatterPlot.prototype.hide = function() {
    this.scatterplot_obj.hide();
  };

  ScatterPlot.prototype.setup_dom = function() {
    console.debug("setting up DOM for plot");
    //Have to initialize with the d3 builder, or doesn't want to show:
    var group = d3.select($(this.grid_ref)[0]).append("g").attr({class: "plot", id: this.plot_id});
    var pane = group.append("g").attr({class: "scatterplot-pane"});
    pane.append("g").attr({class: "load-status"});
    pane.append("g").attr({class: "scatterplot"});
  };

  // TODO rename since x/y labels aren't used now
  ScatterPlot.prototype.setup_labels = function() {
    console.debug("setting up labels for plot");
    var self = this;
    // choose some columns for the x and y axes.
    var numeric_variables = self.model.get_numeric_variables();
    this.x_index = numeric_variables[0];
    this.y_index = numeric_variables[0];
    if("x-selection-" + this.plot_id in self.model.bookmark) {
      this.x_index = Number(self.model.bookmark["x-selection-" + this.plot_id]);
    }
    if("y-selection-" + this.plot_id in this.model.bookmark) {
      this.y_index = Number(self.model.bookmark["y-selection-" + this.plot_id]);
    }
    if("images-selection-" + this.plot_id in this.model.bookmark) {
      self.model.get_image_column(self.model.bookmark["images-selection-" + this.plot_id], function(result){ self.images = result; }, false);
    }
  };

  ScatterPlot.prototype.setup_simulations = function() {
    console.debug("setting up sims for plot");
    // set state of selected and hidden simulations
    this.selected_simulations = [];
    if("simulation-selection" in this.model.bookmark)
      this.selected_simulations = this.model.bookmark["simulation-selection"];
    this.hidden_simulations = [];
    if("hidden-simulations" in this.model.bookmark)
      this.hidden_simulations = this.model.bookmark["hidden-simulations"];
  };

  ScatterPlot.prototype.resize = function() {
    this.scatterplot_obj.scatterplot("option", {
      width: $(this.plot_ref + ".scatterplot-pane").width(),
      height: $(this.plot_ref + ".scatterplot-pane").height()
    });
    if(this.movie){
      this.movie.resize(this);
    }
  };

  ScatterPlot.prototype.update_axis = function(index, axis) {
    var self = this;
    return self.model.get_data_column(index, function(result) {
      self[axis] = result;
    });
  };

  ScatterPlot.prototype.setup = function() {
    console.debug("inside PLOT setup()");
    var self = this;
    // Setup the scatterplot ...
    if(!this.ready && self.model.bookmark && self.model.indices && this.x && this.y && this.v && this.images
       && (this.selected_simulations != null) && (this.hidden_simulations != null))
    {
      this.ready = true;

      $(this.plot_ref + " .scatterplot-pane .load-status").hide();

      var colormap = self.model.bookmark["colormap"] !== undefined ? self.model.bookmark["colormap"] : "night";

      $(this.plot_ref).parents("svg").css("background", $("#color-switcher").colorswitcher("get_background", colormap).toString());

      var open_images = [];
      if("open-images-selection" in self.model.bookmark) {
        open_images = self.model.bookmark["open-images-selection"];
      }
      //Get the first parent that has a defined size, and fill it
      //TODO: Adjust this, the size should likely be calculated based on siblings
      var sized_parent = $("#grid-pane");

      this.scatterplot_obj = $(this.plot_ref + " .scatterplot");
      this.selector_brush = new SelectorBrush(this, this.scatterplot_obj);

      this.scatterplot_obj.scatterplot({
        scatterplot_obj: self,
        selector_brush: self.selector_brush,
        indices: self.model.indices,
        display_pane: "#grid-pane",
        x: self.x,
        y: self.y,
        v: self.v,
        t: self.t,
        images: self.images,
        width: sized_parent.width(),
        height: sized_parent.height(),
        color: $("#color-switcher").colorswitcher("get_color_map", colormap),
        selection: self.selected_simulations,
        server_root: server_root,
        open_images: open_images,
        gradient: $("#color-switcher").colorswitcher("get_gradient_data", colormap),
        hidden_simulations: self.hidden_simulations,
        scalar: self.scalar
      });

      $(self.plot_ref + " .scatterplot").bind("selection-changed", function(event, selection) {
        self.selected_simulations_changed(selection);
      });

      // Changing the color map updates the scatterplot ...
      $("#color-switcher").bind("colormap-changed", function(event, colormap) {
        $(self.plot_ref).parents("svg").css("background", $("#color-switcher").colorswitcher("get_background", colormap).toString());
        $(self.plot_ref + " .scatterplot").scatterplot("option", {
          color:    $("#color-switcher").colorswitcher("get_color_map", colormap),
          gradient: $("#color-switcher").colorswitcher("get_gradient_data", colormap),
        });
      });


      /* TODO: implement the table controls to sync with a 'selected plot'
       // Changing the x variable updates the scatterplot ...
       $("#table").bind("x-selection-changed", function(event, variable) {
       self.update_x(variable);
       });
       // Changing the y variable updates the scatterplot ...
       $("#table").bind("y-selection-changed", function(event, variable) {
       self.update_y(variable);
       });*/

      // Changing the images variable updates the scatterplot ...
      $(self.plot_ref + " .scatterplot").bind("images-selection-changed", function(event, variable) {
        console.debug("changing the images var updates the scatter plot -- ajax");
        self.images_index = variable;
        self.model.get_image_column(variable, function(result){
          $(self.plot_ref + " .scatterplot").scatterplot("option", {images: result});
        }
                              );
      });

      // Log changes to open images ...
      $(self.plot_ref + " .scatterplot").bind("open-images-changed", function(event, selection) {
        self.open_images_changed(selection);
      });
    }
  };

  ScatterPlot.prototype.selected_simulations_changed = function(selection) {
    console.debug("inside selected simulations changed");
    // Logging every selected item is too slow, so just log the count instead.
    console.debug("selectred sim changed changed -- ajax");
    var self = this;
    $.ajax({
      type : "POST",
      url : server_root + "events/models/" + self.model.id + "/select/simulation/count/" + selection.length
    });
    self.model.bookmarker.updateState( {"simulation-selection" : selection} );
    this.selected_simulations = selection;
  };

  ScatterPlot.prototype.images_selection_changed = function(variable) {
    console.debug("inside images selection changed");
    console.debug("images selection changed -- ajax");
    var self = this;
    $.ajax(
      {
        type : "POST",
        url : server_root + "events/models/" + self.model.id + "/select/images/" + variable
      });
    self.model.bookmarker.updateState( {"images-selection" : variable} );
    this.y_index = Number(variable);
  };

  ScatterPlot.prototype.open_images_changed = function(selection) {
    console.debug("inside open images  changed");
    // Logging every open image is too slow, so just log the count instead.
    console.debug("open images changed -- ajax");
    var self = this;
    $.ajax(
      {
        type : "POST",
        url : server_root + "events/models/" + self.model.id + "/select/openimages/count/" + selection.length
      });
    self.model.bookmarker.updateState( {"open-images-selection" : selection} );
  };

  ScatterPlot.prototype.hidden_simulations_changed = function() {
    console.debug("inside hidden simulations  changed");
    // Logging every hidden simulation is too slow, so just log the count instead.
    console.debug("hidden simulations changed -- ajax");
    var self = this;
    $.ajax(
      {
        type : "POST",
        url : server_root + "events/models/" + self.model.id + "/hidden/count/" + self.hidden_simulations.length
      });
    self.model.bookmarker.updateState( {"hidden-simulations" : self.hidden_simulations} );
  };

  ScatterPlot.prototype.display_image = function(uri) {
    console.debug("inside display image");
    this.load_image();
  };

  ScatterPlot.prototype.image_url_for_session = function(file) {
    var sid = this.login.sid_for_file(file);
    return server_root + "remotes/" + sid + "/file" + this.login.pathname_for_file(file);
  }

  ScatterPlot.prototype.load_image = function() {
    console.debug("inside load image");
    var sid = this.login.sid_for_file(file);
    image = document.createElement("img");
    image.src = server_root + "remotes/" + sid + "/file" + image_uri.pathname;
    //TODO why is image_uri not referencing this/self?
    image.width = 100;
    image.style.position="absolute";
    image.style.left=10;
    image.style.top=10;
    $(this.plot_ref + " .scatterplot-pane").prepend(image);
  };

  /*
   Visually renders a selection without sending requests - i.e. table selection and bookmarks aren't updated.
   Currently used for a more performant mid-drag brush select.
   */
  ScatterPlot.prototype.soft_select = function(selection) {
    var self = this;
    self.selected_simulations = selection;
    self.scatterplot_obj.scatterplot({
      selection: self.selected_simulations
    });
  };

  return ScatterPlot;
});
