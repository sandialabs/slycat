function Grid(grid_ref, size, type) {
  this.grid_ref = grid_ref;
  this.size = size || [2,2];
  this.plots = [];
  this.plot_type = type || ScatterPlot;
}

Grid.prototype.setup = function() {
  for(var i=0; i<this.size[0]; i++) {
    for(var j=0; j<this.size[1]; j++) {
      plot = new this.plot_type("plot_" + i + "_" + j, this.grid_ref);
      plot.controls = new Controls(plot);
      this.plots.push(plot);
    }
  }
}

