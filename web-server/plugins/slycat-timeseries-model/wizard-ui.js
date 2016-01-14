define(['slycat-server-root', 'slycat-web-client', 'slycat-dialog', 'knockout', 'knockout-mapping'], function(server_root, client, dialog, ko, mapping) {

  function constructor(params) {
    var component = {};

    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.model = mapping.fromJS({ _id: null, name: 'New Timeseries Model', description: '', marking: null });

    component.directory = ko.observable('');
    component.cluster_sample_count = ko.observable(1000);
    component.cluster_sample_types = ko.observableArray(['uniform-paa', 'uniform-pla']);
    component.cluster_types = ko.observableArray(['average', 'single', 'complete', 'weighted']);
    component.cluster_metrics = ko.observableArray(['euclidean']);

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
        error: dialog.ajax_error('Error creating model.'),
      });
    };

    component.process_parameters = function() {
      component.tab(2);
    };

    component.go_to_model = function() {
      location = server_root + 'models/' + component.model._id();
    };


    component.put_model_parameters = function(callback) {
      client.put_model_parameter({
        mid: component.model._id(),
        aid: 'directory',
        value: component.directory(),
        input: true,
        success: function() {
          client.put_model_parameter({
            mid: component.model._id(),
            aid: 'cluster_sample_count',
            value: component.cluster_sample_count,
            input: true,
            success: function() {
              client.put_model_parameter({
                mid: component.model._id(),
                aid: 'cluster_sample_type',
                value: $('#timeseries-wizard-cluster-sample-type').val(),
                input: true,
                success: function() {
                  client.put_model_parameter({
                    mid: component.model._id(),
                    aid: 'cluster_type',
                    value: $('#timeseries-wizard-cluster-type').val(),
                    input: true,
                    success: function() {
                      client.put_model_parameter({
                        mid: component.model._id(),
                        aid: 'cluster_metric',
                        value: $('#timeseries-wizard-cluster-metric').val(),
                        input: true,
                        success: function() {
                          if (callback)
                            callback();
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    };

    component.finish = function() {
      component.tab(3);
    };

    return component;
  }

  return {
    viewModel: constructor,
    template: { require: 'text!' + server_root + 'resources/wizards/timeseries/ui.html' }
  };

});