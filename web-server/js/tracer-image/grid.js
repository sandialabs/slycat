function Grid(grid_ref, size, type) {
  this.grid_ref = grid_ref;
  this.size = size || [2,2];
  this.plots = [];
  this.plot_type = type || ScatterPlot;
}

Grid.prototype.setup = function() {
  for(var j=0; j<this.size[1]; j++) {
    var row = $("<div/>").attr({id: "row_" + j, translate: "transform(0," + (180*j) + ")"});
    $(this.grid_ref).append(row);
    for(var i=0; i<this.size[0]; i++) {
      var cell = $("<div/>").attr({id: "cell_" + i + "_" + j, style: "float: left; width: " + (row.width() / this.size[0]) + "px;"});
      row.append(cell);
      plot = new this.plot_type("plot_" + i + "_" + j, "#" + cell.attr("id"), {x: 1/this.size[0], y: 1/this.size[1]});
      plot.controls = new Controls(plot);
      this.plots.push(plot);
    }
  }
}

