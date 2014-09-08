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
    size : [0,0]
  },

  _create: function()
  {
    var self = this;
    self.cell_width = self.options.width / self.options.size[0];
    self.cell_height = self.options.height / self.options.size[1];

    // Setup the grid ...
    self.svg = d3.select(self.element.get(0)).append("svg");
    // create plots
    for(var i=0; i<self.options.size[0];i++) {
      for(var j=0; j<self.options.size[1];j++) {
        self.svg.append("g").attr("class", "plot");
        $("g.plot:last").scatterplot({
          indices: indices,
          x_label: table_metadata["column-names"][x_index],
          y_label: table_metadata["column-names"][y_index],
          v_label: table_metadata["column-names"][v_index],
          x: x,
          y: y,
          v: v,
          grid_x: i,
          grid_y: j,
          //images: images,
          // width: $("#scatterplot-pane").width(),
          // height: $("#scatterplot-pane").height(),
          width: self.cell_width,
          height: self.cell_height,
          //color: $("#color-switcher").colorswitcher("get_color_map", colormap),
          //selection: selected_simulations,
          server_root: "{{server-root}}",
          //open_images: open_images,
          //gradient: $("#color-switcher").colorswitcher("get_gradient_data", colormap),
          //hidden_simulations: hidden_simulations
        });
      }
    }
  }
});
