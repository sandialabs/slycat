function Grid(grid_ref, size, type) {
  this.grid_ref = grid_ref;
  this.size = size || [2,2];
  this.plots = [];
  this.plot_type = type || ScatterPlot;

  this.drag_threshold = 3;
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
      console.debug("GOT EHRE after plot");
      plot.controls = new Controls(plot);
      this.plots.push(plot);
    }
  }

  this.selection_layer = grid.append("g");

  var drag_object = {};

  var calculate_plot = function(coordinates)
  {
    var x = Math.floor(coordinates[0] / $(this.plots[0].grid_ref).attr("width"));
    var y = Math.floor(coordinates[1] / $(this.plots[0].grid_ref).attr("height"));

    return this.plots[(this.size[1] * y) + x].scatterplot_obj;
  };

  var invert_selection_location = function(coordinates)
  {
    var x = coordinates[0] % $(this.plots[0].grid_ref).attr("width");
    var y = coordinates[1] % $(this.plots[0].grid_ref).attr("height");
    
    return [x,y];
  }

  var drag_start = function(e)
  {
    e.preventDefault();
    drag_object.drag_start = [e.originalEvent.layerX, e.originalEvent.layerY];

    drag_object.drag_plot = calculate_plot.call(self, drag_object.drag_start);

    d3.select(this.grid_ref).append("rect").attr("class", ".rubberband")
  };

  var drag_end = function(e)
  {
    e.preventDefault();
    drag_object.drag_end = [e.originalEvent.layerX, e.originalEvent.layerY];

    drag_object.drag_start = invert_selection_location.call(self, drag_object.drag_start);
    drag_object.drag_end = invert_selection_location.call(self, drag_object.drag_end);

    drag_object.drag_plot.scatterplot("handle_drag", drag_object, e);

    self.selection_layer.selectAll(".rubberband").remove();

    drag_object = {};
  };

  var drag_move = function(e)
  {
    e.preventDefault();
    if(drag_object.drag_start)
    {
      if(drag_object.drag_end)
      {
        drag_object.drag_end = [e.originalEvent.layerX, e.originalEvent.layerY];

        self.selection_layer.selectAll(".rubberband")
            .attr("x", Math.min(drag_object.drag_start[0], drag_object.drag_end[0]))
            .attr("y", Math.min(drag_object.drag_start[1], drag_object.drag_end[1]))
            .attr("width", Math.abs(drag_object.drag_start[0] - drag_object.drag_end[0]))
            .attr("height", Math.abs(drag_object.drag_start[1] - drag_object.drag_end[1]));
      }
      else
      {
        if(Math.abs(e.originalEvent.layerX - drag_object.drag_start[0]) > 3)
        {
          drag_object.state = "rubber-band-drag";
          drag_object.drag_end = [e.originalEvent.layerX, e.originalEvent.layerY];
          self.selection_layer.append("rect")
            .attr("class", "rubberband")
            .attr("x", Math.min(drag_object.drag_start[0], drag_object.drag_end[0]))
            .attr("y", Math.min(drag_object.drag_start[1], drag_object.drag_end[1]))
            .attr("width", Math.abs(drag_object.drag_start[0] - drag_object.drag_end[0]))
            .attr("height", Math.abs(drag_object.drag_start[1] - drag_object.drag_end[1]))
            .attr("fill", "rgba(255, 255, 0, 0.3)")
            .attr("stroke", "rgb(255, 255, 0)")
            .attr("linewidth", 2)
            ;
        }
      }
    }
  };

  $(grid[0]).select(".datum-layer").mousemove(drag_move)
    .mousedown(drag_start)
    .mouseup(drag_end);
}


Grid.prototype.drag_select = function() {

}
