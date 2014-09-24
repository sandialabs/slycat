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
    width : 0,
    height : 0,
    size : {x:0, y:0},
    data : {x: [], y: [], v: []}
  },

  _create: function()
  {
    var self = this;
    self.cell_width = self.options.width / self.options.size[0];
    self.cell_height = self.options.height / self.options.size[1];

    // Setup the grid ...
    self.svg = d3.select(self.element.get(0)).append("svg");
    self.plots = [];
    // create plots
    for(var i=0; i<self.options.size[0];i++) {
      for(var j=0; j<self.options.size[1];j++) {
        self.svg.append("svg").attr("class", "plot");
        self.plots.push($("g.plot:last").scatterplot({
          indices: indices,
          grid_x: i,
          grid_y: j,
          x: self.options.data.x,
          y: self.options.data.y,
          v: self.options.data.v,
          grid_x: i,
          grid_y: j,
          //images: images,
          width: self.cell_width,
          height: self.cell_height,
          //color: $("#color-switcher").colorswitcher("get_color_map", colormap),
          //selection: selected_simulations,
          server_root: "{{server-root}}",
          //open_images: open_images,
          //gradient: $("#color-switcher").colorswitcher("get_gradient_data", colormap),
          //hidden_simulations: hidden_simulations
        }));
      }
    }
  }
});
