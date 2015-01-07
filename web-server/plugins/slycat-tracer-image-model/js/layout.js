define("Layout", function() {

  function Layout(server_root, server_model) {
    console.debug("Setup layout");
    this.server_root = server_root;
    this.server_model = server_model;
    this.bookmarker = new bookmark_manager(server_root, server_model.project, server_model._id);
    this.bookmark = null;
  };

  //////////////////////////////////////////////////////////////////////////////////////////
  // Setup page layout and forms.
  //////////////////////////////////////////////////////////////////////////////////////////

  // Setup the edit model form ...
  Layout.prototype.setup = function() {
    console.debug("setting up the layout");

    $("#download-data-button").button().click(function() {
      /* do stuff
       if (self.options.selection.length == 0) {
	     self._write_data_table();
	     } else {
       openCSVSaveChoiceDialog();
       }
       $('#csv-save-choice-form').dialog({
       modal: true,
       autoOpen: false,
       buttons: {
       'Save The Whole Table': function() {
	     self._write_data_table();
       //$(this)._write_data_table();  //what's the diff with above?
       $(this).dialog('close');
       },
       'Save Selected Rows': function() {
	     self._write_data_table( self.options.selection );
       $(this).dialog('close');
       },
       'Cancel': function() {
       $(this).dialog('close');
       },
       },

       });
       function openCSVSaveChoiceDialog(){
       var txt = "You have " + self.options.selection.length + " rows selected. What would you like to do?";
       $("#csv-save-choice-form #csv-save-choice-label").text(txt);
       $("#csv-save-choice-form").dialog("open");
       }*/
    });

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
          onresize: function() {
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
            grid.plots.forEach(function(plot) {
              plot.resize();
            });
          },
        }
      });
  };

  //////////////////////////////////////////////////////////////////////////////////////////
  // setup the rest of the ui as data is received.
  //////////////////////////////////////////////////////////////////////////////////////////

  Layout.prototype.setup_colorswitcher = function() {
    console.debug("inside setup_colorswitcher()");
    var self = this;
    var colormap = layout.bookmark["colormap"] !== undefined ? layout.bookmark["colormap"] : "night";

    $("#color-switcher").colorswitcher({colormap:colormap});
    $("#color-switcher").bind("colormap-changed", function(event, colormap) {
      self.selected_colormap_changed(colormap);
    });
  };

  //////////////////////////////////////////////////////////////////////////////////////////
  // Event handlers.
  //////////////////////////////////////////////////////////////////////////////////////////

  Layout.prototype.selected_colormap_changed = function(colormap) {
    console.debug("inside selected_colormap_changed()");
    console.debug("colormap change POST events/models/id/ -- ajax");
    var self = this;

    $.ajax({
      type : "POST",
      url : self.server_root + "events/models/" + self.server_model._id +"/select/colormap/" + colormap
    });
    self.bookmarker.updateState({"colormap" : colormap});
  };

  return Layout;
});
