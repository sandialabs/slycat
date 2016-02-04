define(['slycat-server-root', 'slycat-web-client', 'slycat-dialog', 'knockout', 'knockout-mapping'], function(server_root, client, dialog, ko, mapping) {

  function constructor(params) {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.model = mapping.fromJS({ _id: null, name: 'New Timeseries Model', description: '', marking: null });
    component.is_compute_hdf5 = ko.observable('compute');
    component.remote = mapping.fromJS({hostname: null, username: null, password: null, status: null, status_type: null, enable: ko.computed(function(){return component.is_compute_hdf5() == 'compute' ? true : false;}), focus: false, sid: null});
    component.remote.focus.extend({notify: 'always'});
    component.browser = mapping.fromJS({path:null, selection: []});
    component.timeseries_file = ko.observable('');
    component.in_directory = ko.observable('');
    component.directory = ko.observable('');
    component.cluster_sample_count = ko.observable(1000);
    component.cluster_sample_type = ko.observableArray(['uniform-paa', 'uniform-pla']);
    component.cluster_type = ko.observableArray(['average', 'single', 'complete', 'weighted']);
    component.cluster_metric = ko.observableArray(['euclidean']);

    $('#compute-radio').click(function() {
      if ($(this).is(':checked')) {
        $('#slycat-timeseries-file-wrapper').show();
      } else {
        $('#slycat-timeseries-file-wrapper').hide();
        component.timeseries_file('');
      }
    });

    component.cancel = function() {
      if (component.model._id())
        client.delete_model({ mid: component.model._id() });
    };

    component.create_model = function() {
      client.post_project_models({
        pid: component.project._id(),
        type: 'timeseries',
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

    component.select_compute = function() {
      var c = component.is_compute_hdf5();

      if (c === 'compute' && !component.timeseries_file().trim().length) {
        $('#slycat-timeseries-file-wrapper > input').css('border-color', 'salmon');
        return;
      }

      if (c !== 'compute')
        $('#timeseries-input-directory').hide();

      component.tab(2);
    };

    component.process_parameters = function() {
      component.put_model_parameters();
      component.tab(3);
    };

    component.go_to_model = function() {
      location = server_root + 'models/' + component.model._id();
    };

    component.load_timeseries_file = function() {
      component.tab(2);
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
            aid: 'cluster-sample-count',
            value: component.cluster_sample_count(),
            input: true,
            success: function() {
              client.put_model_parameter({
                mid: component.model._id(),
                aid: 'cluster-sample-type',
                value: $('#timeseries-wizard-cluster-sample-type').val(),
                input: true,
                success: function() {
                  client.put_model_parameter({
                    mid: component.model._id(),
                    aid: 'cluster-type',
                    value: $('#timeseries-wizard-cluster-type').val(),
                    input: true,
                    success: function() {
                      client.put_model_parameter({
                        mid: component.model._id(),
                        aid: 'cluster-metric',
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
      component.tab(4);
    };

    return component;
  }

  return {
    viewModel: constructor,
    template: { require: 'text!' + server_root + 'resources/wizards/timeseries/ui.html' }
  };

});
