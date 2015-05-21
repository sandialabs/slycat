define(['slycat-server-root', 'slycat-web-client', 'slycat-dialog', 'knockout', 'knockout-mapping'], function(server_root, client, dialog, ko, mapping) {
  function constructor(params) {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.model = mapping.fromJS({_id: null, name: 'New STL Model', description: '', marking: null});
    component.browser = mapping.fromJS({selection: []});

    component.cancel = function() {
      if (component.model._id())
        client.delete_model({ mid: component.model._id() });
    };

    component.create_model = function() {
      client.post_project_models({
        pid: component.project._id(),
        type: "stl",
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function(mid) {
          component.model._id(mid);
          component.tab(1);
        },
        error: dialog.ajax_error('Error creating model.')
      });
    };

    component.finish = function() {
      client.post_model_files({
        mid: component.model._id(),
        files: component.browser.selection(),
        input: true,
        names: ["geometry"],
        parser: 'slycat-blob-parser',
        success: function() {
          client.post_model_finish({
            mid: component.model._id(),
            success: function() {
              component.tab(2);
            }
          });
        },
        error: dialog.ajax_error('There was a problem uploading the file: ')
      });
    };

    return component;
  }

  return {
    viewModel: constructor,
    template: { require: 'text!' + server_root + 'resources/wizards/stl/ui.html' },
  };
});
