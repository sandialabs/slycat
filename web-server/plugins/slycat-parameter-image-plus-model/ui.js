$(document).ready(function()
{
//////////////////////////////////////////////////////////////////////////////////////////
// Setup global variables.
//////////////////////////////////////////////////////////////////////////////////////////

var model = null;
var input_columns = null;
var output_columns = null;
var image_columns = null;
var rating_columns = null;
var category_columns = null;

var bookmarker = new bookmark_manager(server_root, project_id, model_id);
var bookmark = null;

var table_metadata = null;
var table_statistics = null;
var indices = null;
var x_index = null;
var y_index = null;
var v_index = null;
var images_index = null;
var x = null;
var y = null;
var v = null;
var images = null;
var selected_simulations = null;
var hidden_simulations = null;
var colormap = null;
var colorscale = null;
var auto_scale = null;
var filtered_v = null;

var table_ready = false;
var scatterplot_ready = false;
var controls_ready = false;

var session_cache = {};
var image_uri = document.createElement("a");

//////////////////////////////////////////////////////////////////////////////////////////
// Load the model
//////////////////////////////////////////////////////////////////////////////////////////

$.ajax(
{
  type : "GET",
  url : server_root + "models/" + model_id,
  success : function(result)
  {
    model = result;
    input_columns = model["artifact:input-columns"];
    output_columns = model["artifact:output-columns"];
    image_columns = model["artifact:image-columns"];
    rating_columns = model["artifact:rating-columns"] == undefined ? [] : model["artifact:rating-columns"];
    category_columns = model["artifact:category-columns"] == undefined ? [] : model["artifact:category-columns"];
    model_loaded();
  },
  error: function(request, status, reason_phrase)
  {
    window.alert("Error retrieving model: " + reason_phrase);
  }
});

//////////////////////////////////////////////////////////////////////////////////////////
// Once the model has been loaded, retrieve metadata / bookmarked state
//////////////////////////////////////////////////////////////////////////////////////////

function model_loaded()
{
  if(model["state"] == "waiting" || model["state"] == "running")
  {
    $("#status-messages").empty().html(
      "<div class='error-heading'>Oops, this model isn't ready yet.</div>" +
      "<div class='error-description'>We're probabably building it for you right now." +
      "Watch the status bar for progress information and more details.</div>");
    show_status_messages();
  }
  else if(model["state"] == "closed" && model["result"] === null)
  {
    $("#status-messages").empty().html(
      "<div class='error-heading'>Oops, it looks like this model was never completed.</div>" +
      "<div class='error-description'>Here's the last thing that was happening before it was closed:</div>" +
      "<pre>" + model["message"] + "</pre>");
    show_status_messages();
  }
  else if(model["result"] == "failed")
  {
    $("#status-messages").empty().html(
      "<div class='error-heading'>Oops, it looks like this model failed to build.</div>" +
      "<div class='error-description'>Here's what was happening when it ended:</div>" +
      "<pre>" + model["message"] + "</pre>");
    show_status_messages();
  }
  else
  {
    // Display progress as the load happens ...
    $(".load-status").text("Loading data.");

    // Mark this model as closed, so it doesn't show-up in the header anymore.
    $.ajax(
    {
      type : "PUT",
      url : server_root + "models/" + model_id,
      contentType : "application/json",
      data : $.toJSON({
        "state" : "closed"
      }),
      processData : false
    });

    // Load data table metadata.
    $.ajax({
      url : server_root + "models/" + model_id + "/tables/data-table/arrays/0/metadata?index=Index",
      contentType : "application/json",
      success: function(metadata)
      {
        table_metadata = metadata;
        table_statistics = new Array(metadata["column-count"]);
        table_statistics[metadata["column-count"]-1] = {"max": metadata["row-count"]-1, "min": 0};
        load_table_statistics(d3.range(metadata["column-count"]-1), metadata_loaded);
      },
      error: artifact_missing
    });

    // Retrieve bookmarked state information ...
    bookmarker.get_state(function(state)
    {
      bookmark = state;
      setup_colorswitcher();
      metadata_loaded();
    });
  }
}

function show_status_messages()
{
  $("#status-messages").dialog(
  {
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

function artifact_missing()
{
  $(".load-status").css("display", "none");

  $("#status-messages").empty().html(
    "<div class='error-heading'>Oops, there was a problem retrieving data from the model.</div>" +
    "<div class='error-description'>This probably means that there was a problem building the model. " +
    "Here's the last thing that was going on with it:</div>" +
    "<pre>" + model["message"] + "</pre>");

  show_status_messages();
}

//////////////////////////////////////////////////////////////////////////////////////////
// Setup page layout.
//////////////////////////////////////////////////////////////////////////////////////////

$(".parameter-image").layout(
{
  north:
  {
  },
  center:
  {
  },
  south:
  {
    size: $("body").height() / 2,
    resizeWhileDragging: false,
    onresize: function()
    {
      $("#table").css("height", $("#table-pane").height());
      $("#table").table("resize_canvas");
    }
  },
});

$("#model-pane").layout(
{
  center:
  {
    resizeWhileDragging: false,
    onresize: function() { 
      $("#scatterplot").scatterplot("option", {
        width: $("#scatterplot-pane").width(), 
        height: $("#scatterplot-pane").height()
      }); 
    },
  }
});

//////////////////////////////////////////////////////////////////////////////////////////
// Setup the rest of the UI as data is received.
//////////////////////////////////////////////////////////////////////////////////////////

function setup_colorswitcher()
{
  var colormap = bookmark["colormap"] !== undefined ? bookmark["colormap"] : "night";

  $("#color-switcher").colorswitcher({colormap:colormap});

  $("#color-switcher").bind("colormap-changed", function(event, colormap)
  {
    selected_colormap_changed(colormap);
  });
}
























// END
});