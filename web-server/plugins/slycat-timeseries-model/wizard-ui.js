define(['slycat-server-root', 'slycat-web-client', 'slycat-dialog', 'slycat-markings', 'knockout', 'knockout-mapping'], function(server_root, client, dialog, markings, ko, mapping) {

  function constructor(params) {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.model = mapping.fromJS({ _id: null, name: 'New Timeseries Model', description: '', marking: markings.preselected() });
    component.remote = mapping.fromJS({hostname: null, username: null, password: null, status: null, status_type: null, enable: ko.computed(function(){return true;}), focus: false, sid: null});
    component.remote.focus.extend({notify: 'always'});
    component.browser = mapping.fromJS({path:null, selection: []});
    component.inputs_file = ko.observable('');
    component.output_directory = ko.observable('');
    component.id_column = ko.observable('%eval_id');
    component.inputs_file_delimiter = ko.observable(',');

    component.create_model = function() {
      client.post_project_models({
        pid: component.project._id(),
        type: 'timeseries',
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function(mid) {
          component.model._id(mid);
          component.remote.focus(true);
        },
        error: dialog.ajax_error('Error creating model.'),
      });
    };

    // Create a model as soon as the dialog loads. We rename, change description and marking later
    component.create_model();

    component.cancel = function() {
      if (component.remote.sid())
        client.delete_remote({ sid: component.remote.sid() });

      if (component.model._id())
        client.delete_model({ mid: component.model._id() });
    };

    component.connect = function() {
      component.remote.status_type('info');
      component.remote.status('Connecting...');
      client.post_remotes({
        hostname: component.remote.hostname(),
        username: component.remote.username(),
        password: component.remote.password(),
        success: function(sid) {
          $('.modal-dialog').addClass('modal-lg');
          component.remote.sid(sid);
          component.tab(1);
        },
        error: function(request, status, reason_phrase) {
          component.remote.status_type('danger');
          component.remote.status(reason_phrase);
          component.remote.focus('password');
        }
      });
    };

    component.select_input_file = function() {
      component.inputs_file(component.browser.selection()[0]);
      component.tab(2);
    };

    component.name_model = function() {
      client.put_model({
        mid: component.model._id(),
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function() {
          component.go_to_model();
        }
      })
    }

    component.go_to_model = function() {
      location = server_root + 'models/' + component.model._id();
    };

    component.put_model_parameters = function(callback) {
    };

    component.to_compute = function() {
      component.tab(3);
    };

    component.compute = function() {
      var vm = ko.dataFor($('.slycat-remote-interface')[0]);
      vm.submit_job();
    };

    component.to_compute_next_step = function() {
      component.tab(4);
    };

    return component;
  }

  return {
    viewModel: constructor,
    template: { require: 'text!' + server_root + 'resources/wizards/timeseries/ui.html' }
  };

});
