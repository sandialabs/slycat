define(['slycat-server-root', 'slycat-web-client', 'slycat-dialog', 'slycat-markings', 'knockout', 'knockout-mapping'], function(server_root, client, dialog, markings, ko, mapping) {

  function constructor(params) {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.model = mapping.fromJS({ _id: null, name: 'New Timeseries Model', description: '', marking: markings.preselected() });
    component.timeseries_type = ko.observable('csv');
    component.remote = mapping.fromJS({hostname: null, username: null, password: null, status: null, status_type: null, enable: ko.computed(function(){return true;}), focus: false, sid: null});
    component.remote.focus.extend({notify: 'always'});
    component.browser = mapping.fromJS({path:null, selection: []});
    component.to_hdf5 = ko.observable(true);
    component.inputs_file = ko.observable('');
    component.input_directory = ko.observable('');
    component.output_directory = ko.observable('');
    component.id_column = ko.observable('%eval_id');
    component.inputs_file_delimiter = ko.observable(',');
    component.xyce_timeseries_file = ko.observable('');
    component.timeseries_name = ko.observable('');
		component.cluster_sample_count = ko.observable(500);
    component.cluster_sample_type = ko.observableArray(['uniform-paa', 'uniform-pla']);
    component.cluster_type = ko.observableArray(['average', 'single', 'complete', 'weighted']);
    component.cluster_metric = ko.observableArray(['euclidean']);
    component.wckey = ko.observable('');
    component.partition = ko.observable('');
    component.workdir = ko.observable('');


    var removeErrors = function() {
      $('.form-group').removeClass('has-error');
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

    component.to_remote = function() {
      component.tab(1);
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

          client.get_user_config({
            sid: component.remote.sid(),
            success: function(response) {
              if (response.errors.length > 0) {
                component.tab(2);
                return void 0;
              }

              if (response.config['timeseries-wizard']) {
                response.config['timeseries-wizard']['persistent-output'] ? component.output_directory(response.config['timeseries-wizard']['persistent-output']) : null;
                response.config['timeseries-wizard']['timeseries-name'] ? component.timeseries_name(response.config['timeseries-wizard']['timeseries-name']) : null;
              }

              if (response.config.slurm) {
                response.config.slurm.wcid ? component.wckey(response.config.slurm.wcid) : null;
                response.config.slurm.partition ? component.partition(response.config.slurm.partition) : null;
                response.config.slurm.workdir ? component.workdir(response.config.slurm.workdir) : null;
              }

              component.tab(2);
            }
          });
        },
        error: function(request, status, reason_phrase) {
          component.remote.status_type('danger');
          component.remote.status(reason_phrase);
          component.remote.focus('password');
        }
      });
    };

    component.select_input_file = function() {
      var file_path = component.browser.selection()[0];
      component.inputs_file(file_path);

      if (component.timeseries_type() === 'xyce') {
        var in_dir = file_path.substring(0, file_path.lastIndexOf('/') + 1);
        component.input_directory(in_dir);

        component.tab(7);
      } else
        component.tab(3);
    };

    component.select_xyce_timeseries_file = function() {
      var filepath = component.browser.selection()[0];
      var filename = filepath.split('/');
      filename = filename[filename.length - 1];
      component.xyce_timeseries_file(filename);

      component.tab(3);
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
    };

    component.to_timeseries_parameters = function() {
      var validated = true;
      removeErrors();

      if (!component.output_directory().length) {
        $('#form-output-directory').addClass('has-error');
        validated = false;
      }

      if (!component.id_column().length) {
        $('#form-id-column-name').addClass('has-error');
        validated = false;
      }

      if (component.timeseries_type() === 'csv' && !component.inputs_file_delimiter().length) {
        $('#form-inputs-file-delimiter').addClass('has-error');
        validated = false;
      }

      if (validated)
        component.tab(4);
    };

    component.to_compute = function() {
      var validated = true;
      removeErrors();

      if (component.timeseries_type() === 'csv' && !component.timeseries_name().length) {
        $('#form-timeseries-name').addClass('has-error');
        validated = false;
      }

      if (typeof component.cluster_sample_count() !== 'number' && !component.cluster_sample_count().length) {
        $('#form-cluster-sample-count').addClass('has-error');
        validated = false;
      }

      if (validated) {
        component.put_model_parameters();
        component.tab(5);

        var vm = ko.dataFor($('.slycat-remote-interface')[0]);
        vm.wckey(component.wckey());
        vm.partition(component.partition());
        vm.workdir(component.workdir());
      }
    };

    component.compute = function() {
      var vm = ko.dataFor($('.slycat-remote-interface')[0]);
      vm.submit_job();
    };

    component.to_compute_next_step = function() {
      component.tab(6);
    };

    component.back = function() {
      var target = component.tab();
      console.log(target);

      if (component.tab() == 7) {
        target = 2;
      } else if (component.tab() == 3 && component.timeseries_type() === 'xyce') {
        target = 7;
      } else
        target--;

      component.tab(target);
    };

    return component;
  }

  return {
    viewModel: constructor,
    template: { require: 'text!' + server_root + 'resources/wizards/timeseries/ui.html' }
  };

});
