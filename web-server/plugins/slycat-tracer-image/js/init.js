/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define("slycat-tracer-image-model", ["slycat-model-main", "Model", "Layout", "Table", "Grid", "ScatterPlot", "slycat-tracer-model-login", "domReady!"], function(slycat_main, Model, Layout, Table, Grid, ScatterPlot, Login) {
  slycat_main.start(); //for some reason this isn't running before the model-specific JS executes like it does for the other models
  $(window).resize(); //triggers slycat_main module to set the height of div.slycat-content, which as a parent node is required for jQuery UI layout
  var grid_pane = "#grid-pane";
  var login = new Login(grid_pane);
  var model = new Model(login);
  var layout = new Layout(model);
  var grid = new Grid(grid_pane, [2,2], ScatterPlot, model, login);
  layout.setup(grid);
  var table = new Table(model, grid);
  model.load(layout, table, grid);
  grid.setup();
});
