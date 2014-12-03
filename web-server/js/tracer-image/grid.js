function Grid(grid_ref, size, type) {
  this.grid_ref = grid_ref;
  this.size = size || [2,2];
  this.plots = [];
  this.plot_type = type || ScatterPlot;
  this.selected_simulations = [];
  this.drag_threshold = 3;
};

Grid.prototype._get_percentage = function(number_objects) {
  return 100/number_objects + "%";
};

Grid.prototype.setup = function() {
  var self = this;

  var grid = d3.select($(self.grid_ref)[0]).append("svg").attr({
    height: "100%",
    width: "100%"
  });


  var update_plot_dimensions = function(plot_container, plot_loc) {
    return function() {
      var min_width = self.plots[0] ? $(self.plots[0].plot_ref)[0].getBBox().width : 0;
      var single_pane_height = $(self.grid_ref).height()/self.size[1];
      var single_pane_width = d3.max([$(self.grid_ref).width()/self.size[0], min_width]);
      plot_container.attr({
        transform: "translate(" +
            plot_loc[0]*single_pane_width + " " +
            plot_loc[1]*single_pane_height + ")",
        width: single_pane_width,
        height: single_pane_height
      });
    };
  };

  for(var j=0; j<this.size[1]; j++) {
    for(var i=0; i<this.size[0]; i++) {
      var cell = grid.append("g").attr({id: "cell_" + i + "_" + j,
        });
      update_plot_dimensions(cell, [i,j])();
      $(this.grid_ref).resize(update_plot_dimensions(cell, [i,j]));
      plot = new this.plot_type("plot_" + i + "_" + j, "#" + cell.attr("id"), {x: 1/this.size[0], y: 1/this.size[1]}, self);
      console.debug("GOT EHRE after plot");
      this.plots.push(plot);
    }
  }

  this.selection_layer = grid.append("g");

  var calculate_plot = function(coordinates)
  {
    var x = Math.floor(coordinates[0] / $(this.plots[0].grid_ref).attr("width"));
    var y = Math.floor(coordinates[1] / $(this.plots[0].grid_ref).attr("height"));

    return this.plots[(this.size[1] * y) + x].scatterplot_obj;
  };

  var invert_selection_location = function(first_point, second_point)
  {
    var x1 = first_point[0] % $(this.plots[0].grid_ref).attr("width");
    var y1 = first_point[1] % $(this.plots[0].grid_ref).attr("height");

    //To ensure we don't cross boundaries into other plots:
    var diff_x = first_point[0] - x1
    var diff_y = first_point[1] - y1

    var x2 = second_point[0] - diff_x;
    var y2 = second_point[1] - diff_y;

    return {start: [x1, y1], end: [x2, y2]};
  }
};

Grid.prototype.open_images = function(images) {
  this.plots.forEach(function(plot){
    plot.scatterplot_obj.scatterplot("force_update", {open_images: true});
  });
};

/*
 Visually renders a selection on ALL plots without sending requests - i.e. table selection and bookmarks aren't updated.
 Currently used for a more performant mid-drag brush select.
*/
Grid.prototype.global_soft_select = function(selection) {
  var self = this;
  self.selected_simulations = selection;
  self.plots.forEach(function(plot) {
    plot.soft_select(self.selected_simulations);
  });
};
