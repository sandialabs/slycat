/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

//////////////////////////////////////////////////////////////////////////////////
// d3js.org grid visualization, for use with the tracer-image model.


$.widget("tracer_image.grid",
{
  options:
  {
    width : 300,
    height : 300,
    size : [2,2]
  },

  _create: function()
  {
    var self = this;
    self.cell_width = self.options.width / self.options.size[0];
    self.cell_height = self.options.height / self.options.size[1];

    // Setup the grid ...
    self.svg = d3.select(self.element.get(0)).append("svg");
    // create plots
    for(x=0; x<self.options.size[0];x++) {
      for(y=0; y<self.options.size[1];y++) {
        self.svg.append("g").attr("class", "plot");
        $("g.plot:last").plot({
          grid_x: x,
          grid_y: y,
          width: self.cell_width,
          height: self.cell_height
        });
      }
    }
  }
});
