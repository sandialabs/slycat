define("slycat-tracer-image-model", ["slycat-model-main", "Model", "Layout", "Table", "Grid", "ScatterPlot", "Login", "domReady!"], function(slycat_main, Model, Layout, Table, Grid, ScatterPlot, Login) {
  slycat_main.start(); //for some reason this isn't running before the model-specific JS executes like it does for the other models
  $(window).resize(); //triggers slycat_main module to set the height of div.slycat-content, which as a parent node is required for jQuery UI layout
  var model = new Model();
  var layout = new Layout(model);
  var grid_pane = "#grid-pane";
  var login = new Login(grid_pane);
  var grid = new Grid(grid_pane, [2,2], ScatterPlot, model, login);
  layout.setup(grid);
  var table = new Table(model, grid);
  model.load(layout, table, grid);
  grid.setup();
});
