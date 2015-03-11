define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "slycat-bookmark-manager", "knockout", "knockout-mapping"], function(server_root, client, dialog, bookmark_manager, ko, mapping)
{
  function constructor(params)
  {
    var component = {};
    component.show_wizard = params.show_wizard;
    component.project = params.projects()[0];
    component.model = params.models()[0];
    component.name = ko.observable("");

    component.save_bookmark = function()
    {
      client.post_project_references(
      {
        pid: component.project._id(),
        name: component.name(),
        "model-type": component.model["model-type"](),
        mid: bookmark_manager.current_mid(),
        bid: bookmark_manager.current_bid(),
        error: dialog.ajax_error("Error creating saved bookmark."),
      });
    }

    if(!bookmark_manager.current_bid())
    {
      dialog.dialog(
      {
        title: "Can't Save Bookmark",
        message: "Since you haven't made any changes to the model state, there is no bookmark to save.",
        callback: function()
        {
          component.show_wizard(false);
        }
      });
    }

    return component;
  }

  return {
    viewModel: constructor,
    template: { require: "text!" + server_root + "resources/wizards/slycat-create-saved-bookmark/ui.html" },
    };
});
