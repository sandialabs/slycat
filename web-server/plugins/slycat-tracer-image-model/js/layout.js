function Layout() {
  console.debug("Setup layout");
  this.bookmarker = new bookmark_manager("{{server-root}}", "{{#full-project}}{{_id}}{{/full-project}}", "{{_id}}");
  this.bookmark = null;
}

//////////////////////////////////////////////////////////////////////////////////////////
// Setup page layout and forms.
//////////////////////////////////////////////////////////////////////////////////////////

// Setup the edit model form ...
Layout.prototype.setup = function() {
  console.debug("setting up the layout");
  $("#edit-model-form").dialog(
    {
      autoOpen: false,
      width: 700,
      height: 300,
      modal: true,
      buttons:
      {
        "Save Changes": function()
        {
          var model =
                {
                  "name" : $("#edit-model-name").val(),
                  "description" : $("#edit-model-description").val()
                };

          console.debug("save model changes -- ajax");
          $.ajax(
            {
              type : "PUT",
              url : "{{server-root}}models/{{_id}}",
              contentType : "application/json",
              data : $.toJSON(model),
              processData : false,
              success : function()
              {
                window.location.reload();
              },
              error : function(request, status, reason_phrase)
              {
                window.alert("Error updating model: " + reason_phrase);
              }
            });
        },
        Cancel: function()
        {
          $(this).dialog("close");
        }
      },
      close: function()
      {
      }
    });

  $("#delete-model-link").click(function(){
    if(!window.confirm("Delete model {{name}}?  This cannot be undone."))
      return false;

    console.debug("delete model -- ajax");
    $.ajax(
      {
        type : "DELETE",
        url : "{{server-root}}models/{{_id}}",
        success : function(details)
        {
          window.location.href = "{{server-root}}projects/{{#full-project}}{{_id}}{{/full-project}}";
        },
        error : function(request, status, reason_phrase)
        {
          window.alert("Error deleting model: " + reason_phrase);
        }
      });
  });

  $("#edit-model-button").button().click(function() {
    $("#edit-model-form").dialog("open");
    $("#edit-model-name").focus();
  });
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
  $.ajax(
    {
      type : "POST",
      url : "{{server-root}}events/models/{{_id}}/select/colormap/" + colormap
    });
  this.bookmarker.updateState({"colormap" : colormap});
};
