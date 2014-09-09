$(document).ready(function() {
  // Layout resizable panels ...
  $("body").layout(
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
        $("#grid").grid("option", {
          width: $("#grid-pane").width(), 
          height: $("#grid-pane").height()
        }); 
      },
    }
  });
});

// Setup the rest of the UI as data is received.
function setup_colorswitcher()
{
  var colormap = bookmark["colormap"] !== undefined ? bookmark["colormap"] : "night";

  $("#color-switcher").colorswitcher({colormap:colormap});
  $("#color-switcher").bind("colormap-changed", function(event, colormap)
  {
    selected_colormap_changed(colormap);
  });
}
