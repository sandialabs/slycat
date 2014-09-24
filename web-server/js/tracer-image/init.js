function show_status_messages() {
  console.debug("Inside show_status_messages()");
  $("#status-messages").dialog({
    autoOpen: true,
    width: 500,
    height: 300,
    modal: false,
    buttons:
    {
      OK: function()
      {
        $("#status-messages").dialog("close");
      }
    }
  });
}

function artifact_missing() {
  console.debug("Inside artifact_missing()");
  $(".load-status").css("display", "none");

  $("#status-messages").empty().html(
    "<div class='error-heading'>Oops, there was a problem retrieving data from the model.</div>" +
      "<div class='error-description'>This probably means that there was a problem building the model. " +
      "Here's the last thing that was going on with it:</div>" +
      "<pre>" + model["message"] + "</pre>");

  show_status_messages();
}

var grid_pane = "#grid-pane";
var layout = new Layout(); //load first to instantiate bookmarker
var model = new Model();
model.load();
var table = new Table();
layout.setup();
var grid = new Grid(grid_pane, [2,2], ScatterPlot);
grid.setup();
var login = new Login(grid_pane, model.server_root);

// playing around with movie triggering, always first plot for now
//grid.plots[0].movie.play();
