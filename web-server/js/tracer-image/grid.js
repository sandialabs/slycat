function Grid(grid_ref, size, type) {
  this.grid_ref = grid_ref;
  this.size = size || [2,2];
  this.plots = [];
  this.plot_type = type || ScatterPlot;
}

Grid.prototype._get_percentage = function(number_objects) {
  return 100/number_objects + "%";
}

Grid.prototype.setup = function() {
  var grid = d3.select($(this.grid_ref)[0]).append("svg").attr({
    height: "100%",
    width: "100%"
  })

  var self = this;
  var update_plot_dimensions = function(plot_container, plot_loc){
    return function(){
      var single_pane_height = $(self.grid_ref).height()/self.size[1];
      var single_pane_width = $(self.grid_ref).width()/self.size[0];
      plot_container.attr({
        transform: "translate(" +
            plot_loc[0]*single_pane_width + " " + 
            plot_loc[1]*single_pane_height + ")",
        width: single_pane_width,
        height: single_pane_height
      })
    }
  };

  for(var j=0; j<this.size[1]; j++) {
    for(var i=0; i<this.size[0]; i++) {
      var cell = grid.append("g").attr({id: "cell_" + i + "_" + j,
        }); 
      update_plot_dimensions(cell, [i,j])();
      $(this.grid_ref).resize(update_plot_dimensions(cell, [i,j]));
      plot = new this.plot_type("plot_" + i + "_" + j, "#" + cell.attr("id"), {x: 1/this.size[0], y: 1/this.size[1]});
      plot.controls = new Controls(plot);
      this.plots.push(plot);
    }
  }
}

