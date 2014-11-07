require.config(
{
  paths :
  {
    "knockout" : "knockout-3.2.0",
  },
});

require(["knockout", "knockout.mapping", "domReady!"], function(knockout, km)
{
  var server_root = document.querySelector("#slycat-server-root").getAttribute("href");

  $("button").button();

  var state =
  {
    new_name : knockout.observable(""),
    new_description : knockout.observable(""),
    edit_model : function()
    {
      state.new_name(state.model.name());
      state.new_description(state.model.description());
      $("#edit-model-dialog").dialog("open");
    },
  };

  // Get the model.
  $.ajax(
  {
    dataType : "json",
    type : "GET",
    url : location.href,
    success : function(model)
    {
      state.model = km.fromJS(model);

      // Get the owning project.
      $.ajax(
      {
        dataType : "json",
        type : "GET",
        url : server_root + "projects/" + model.project,
        success : function(project)
        {
          state.project = km.fromJS(project);
          state.project.url = server_root + "projects/" + model.project;
          knockout.applyBindings(state);
        }
      });

      // Mark this model as closed, so it doesn't show-up in the header anymore.
      $.ajax(
      {
        contentType : "application/json",
        data : $.toJSON({ "state" : "closed" }),
        processData : false,
        type : "PUT",
        url : location.href,
      });
    },
  });

  $("#edit-model-dialog").dialog(
  {
    autoOpen: false,
    height: 500,
    width: 680,
    modal: true,
    buttons:
    {
      "Delete Model" : function()
      {
        if(!window.confirm("Delete model " + state.model.name() + "?  This cannot be undone."))
          return;

        $.ajax(
        {
          type : "DELETE",
          url : location.href,
          success : function(details)
          {
            window.location.href = state.project.url;
          },
          error : function(request, status, reason_phrase)
          {
            window.alert("Error deleting model: " + reason_phrase);
          }
        });
      },
      "Save Changes": function()
      {
        var model =
        {
          "name" : state.new_name(),
          "description" : state.new_description(),
        };

        $.ajax(
        {
          type : "PUT",
          url : location.href,
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

});

