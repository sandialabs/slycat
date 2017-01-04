define(['slycat-server-root', 'slycat-web-client', 'slycat-dialog', 'slycat-markings', 'knockout', 'knockout-mapping'], function(server_root, client, dialog, markings, ko, mapping) {

  function constructor(params) {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.model = mapping.fromJS({ _id: null, name: 'New Timeseries Model', description: '', marking: markings.preselected() });
    component.timeseries_type = ko.observable('xyce');
    component.remote = mapping.fromJS({hostname: null, username: null, password: null, status: null, status_type: null, enable: true, focus: false, sid: null, session_exists: false});
    component.remote.focus.extend({notify: 'always'});
    component.browser_input = mapping.fromJS({path:null, selection: []});
    component.browser_timeseries = mapping.fromJS({path:null, selection: []});
    component.browser_hdf5 = mapping.fromJS({path:null, selection: []});
    component.inputs_file = ko.observable('');
    component.input_directory = ko.observable('');
    component.hdf5_directory = ko.observable('');
    component.id_column = ko.observable('%eval_id');
    component.inputs_file_delimiter = ko.observable(',');
    component.xyce_timeseries_file = ko.observable('');
    component.timeseries_name = ko.observable('');
    component.cluster_sample_count = ko.observable(500);
    component.cluster_sample_type = ko.observableArray(['uniform-paa', 'uniform-pla']);
    component.cluster_type = ko.observableArray(['average', 'single', 'complete', 'weighted']);
    component.cluster_metric = ko.observableArray(['euclidean']);
    // SLURM parameters
    component.wckey = ko.observable('');
    component.partition = ko.observable('');
    component.workdir = ko.observable('');
    // component.nnodes = ko.observable('1');
    // component.ntasks_per_node = ko.observable('1');
    // component.time_hours = ko.observable('');
    // component.time_minutes = ko.observable('');
    // component.time_seconds = ko.observable('');

    component.timeseries_type.subscribe(function(newValue){
      var vm = ko.dataFor($('.slycat-remote-interface')[0]);
      vm.retain_hdf5(newValue == 'hdf5');
    });

    component.user_config = {};

    var removeErrors = function() {
      $('.form-group').removeClass('has-error');
    };

    var updateUserConfig = function() {
      component.user_config['timeseries-wizard'] = component.user_config['timeseries-wizard'] || {};
      // component.user_config['timeseries-wizard']['persistent-output'] = component.output_directory();
      component.user_config['timeseries-wizard']['id-column'] = component.id_column();
      component.user_config['timeseries-wizard']['inputs-file-delimiter'] = component.inputs_file_delimiter();
      if(component.timeseries_type === "csv"){
        component.user_config['timeseries-wizard']['timeseries-name'] = component.timeseries_name();
      }
      else{
        component.user_config['timeseries-wizard']['timeseries-name'] = "";
      }

      client.set_user_config({
        hostname: component.remote.hostname(),
        config: component.user_config,
        success: function(response) { },
        error: function(request, status, reason_phrase) {
          console.log(reason_phrase);
        }
      });
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
      if (component.model._id())
        client.delete_model({ mid: component.model._id() });
    };

    component.connect = function() {
      var vm = ko.dataFor($('.slycat-remote-interface')[0]);
      
      component.remote.status_type('info');
      component.remote.status('Connecting...');
      if(component.remote.session_exists())
      {
        component.remote.enable(true);
        component.remote.status_type(null);
        component.remote.status(null);
        client.get_user_config({
            hostname: component.remote.hostname(),
            success: function(response) {
              if (response.errors.length > 0) {
                component.tab(2);
                return void 0;
              }

              if (response.config['timeseries-wizard']) {
                // response.config['timeseries-wizard']['persistent-output'] ? component.output_directory(response.config['timeseries-wizard']['persistent-output']) : null;
                response.config['timeseries-wizard']['timeseries-name'] ? component.timeseries_name(response.config['timeseries-wizard']['timeseries-name']) : null;
                response.config['timeseries-wizard']['id-column'] ? component.id_column(response.config['timeseries-wizard']['id-column']) : null;
                response.config['timeseries-wizard']['inputs-file-delimiter'] ? component.inputs_file_delimiter(response.config['timeseries-wizard']['inputs-file-delimiter']) : null;
              }

              if (response.config.slurm) {
                response.config.slurm.wcid ? component.wckey(response.config.slurm.wcid) : null;
                response.config.slurm.partition ? component.partition(response.config.slurm.partition) : null;
                response.config.slurm.workdir ? component.workdir(response.config.slurm.workdir) : null;

                response.config.slurm.nnodes ? vm.nnodes(response.config.slurm.nnodes) : null;
                response.config.slurm['ntasks-per-node'] ? vm.ntasks_per_node(response.config.slurm['ntasks-per-node']) : null;

                // Restore state of time controls if user unchecked "Use recommended values" checkbox last
                var time_recommended = !(response.config.slurm['time_recommended'] == 'False');
                if(!time_recommended)
                {
                  vm.time_recommended(time_recommended);
                  response.config.slurm['time-hours'] ? vm.time_hours(response.config.slurm['time-hours']) : null;
                  response.config.slurm['time-minutes'] ? vm.time_minutes(response.config.slurm['time-minutes']) : null;
                  response.config.slurm['time-seconds'] ? vm.time_seconds(response.config.slurm['time-seconds']) : null;
                }
              }

              component.user_config = response.config;
              component.tab(2);
            }
          });
      }else{
          client.post_remotes({
            hostname: component.remote.hostname(),
            username: component.remote.username(),
            password: component.remote.password(),
            success: function(sid) {
              $('.modal-dialog').addClass('modal-lg');
              component.remote.session_exists(true);
              component.remote.sid(sid);
              component.remote.enable(true);
              component.remote.status_type(null);
              component.remote.status(null);
              client.get_user_config({
                hostname: component.remote.hostname(),
                success: function(response) {
                  if (response.errors.length > 0) {
                    component.tab(2);
                    return void 0;
                  }

                  if (response.config['timeseries-wizard']) {
                    // response.config['timeseries-wizard']['persistent-output'] ? component.output_directory(response.config['timeseries-wizard']['persistent-output']) : null;
                    response.config['timeseries-wizard']['timeseries-name'] ? component.timeseries_name(response.config['timeseries-wizard']['timeseries-name']) : null;
                    response.config['timeseries-wizard']['id-column'] ? component.id_column(response.config['timeseries-wizard']['id-column']) : null;
                    response.config['timeseries-wizard']['inputs-file-delimiter'] ? component.inputs_file_delimiter(response.config['timeseries-wizard']['inputs-file-delimiter']) : null;
                  }

                  if (response.config.slurm) {
                    response.config.slurm.wcid ? component.wckey(response.config.slurm.wcid) : null;
                    response.config.slurm.partition ? component.partition(response.config.slurm.partition) : null;
                    response.config.slurm.workdir ? component.workdir(response.config.slurm.workdir) : null;

                    response.config.slurm.nnodes ? vm.nnodes(response.config.slurm.nnodes) : null;
                    response.config.slurm['ntasks-per-node'] ? vm.ntasks_per_node(response.config.slurm['ntasks-per-node']) : null;

                    // Restore state of time controls if user unchecked "Use recommended values" checkbox last
                    var time_recommended = !(response.config.slurm['time_recommended'] == 'False');
                    if(!time_recommended)
                    {
                      vm.time_recommended(time_recommended);
                      response.config.slurm['time-hours'] ? vm.time_hours(response.config.slurm['time-hours']) : null;
                      response.config.slurm['time-minutes'] ? vm.time_minutes(response.config.slurm['time-minutes']) : null;
                      response.config.slurm['time-seconds'] ? vm.time_seconds(response.config.slurm['time-seconds']) : null;
                    }
                  }

                  component.user_config = response.config;
                  component.tab(2);
                }
              });
            },
            error: function(request, status, reason_phrase) {
              component.remote.enable(true);
              component.remote.status_type('danger');
              component.remote.status(reason_phrase);
              component.remote.focus('password');
            }
          })
      };
    };

    component.select_input_file = function() {
      var file_path = component.browser_input.selection()[0];
      component.inputs_file(file_path);

      if (component.timeseries_type() === 'xyce') {
        var in_dir = file_path.substring(0, file_path.lastIndexOf('/') + 1);
        component.input_directory(in_dir);
      }

      component.tab(4);
    };

    component.params_continue = function() {
      var validated = true;
      removeErrors();

      if (!component.id_column().trim().length) {
        $('#form-id-column-name').addClass('has-error');
        validated = false;
      }

      if (component.timeseries_type() === 'csv' && !component.inputs_file_delimiter().trim().length) {
        $('#form-inputs-file-delimiter').addClass('has-error');
        validated = false;
      }

      if (component.timeseries_type() === 'csv' && !component.timeseries_name().trim().length) {
        $('#form-timeseries-name').addClass('has-error');
        validated = false;
      }

      if (Number(component.cluster_sample_count()) < 2) {
        $('#form-cluster-sample-count').addClass('has-error');
        validated = false;
      }

      if (validated) {
        component.put_model_parameters();

        var vm = ko.dataFor($('.slycat-remote-interface')[0]);
        vm.wckey(component.wckey());
        vm.partition(component.partition());
        vm.workdir(component.workdir());
        // vm.nnodes(component.nnodes());
        // vm.ntasks_per_node(component.ntasks_per_node());
        // vm.time_hours(component.time_hours());
        // vm.time_minutes(component.time_minutes());
        // vm.time_seconds(component.time_seconds());

        if(component.timeseries_type() === 'xyce') 
        {
          component.tab(7);
        } 
        else if(component.timeseries_type() == 'hdf5')
        {
          component.tab(3);
        }
        else {
          component.tab(5);
        }
      }
    };

    component.select_xyce_timeseries_file = function() {
      var filepath = component.browser_timeseries.selection()[0];
      var filename = filepath.split('/');
      filename = filename[filename.length - 1];
      component.xyce_timeseries_file(filename);

      component.tab(5);
    };

    component.select_hdf5_directory = function() {
      component.hdf5_directory( component.browser_hdf5.path() );

      component.tab(5);
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

    component.compute = function() {
      var vm = ko.dataFor($('.slycat-remote-interface')[0]);
      
      component.user_config['slurm'] = component.user_config['slurm'] || {};
      component.user_config['slurm']['wcid'] = vm.wckey();
      component.user_config['slurm']['partition'] = vm.partition();
      component.user_config['slurm']['workdir'] = vm.workdir();
      component.user_config['slurm']['time-hours'] = vm.time_hours();
      component.user_config['slurm']['time-minutes'] = vm.time_minutes();
      component.user_config['slurm']['time-seconds'] = vm.time_seconds();
      component.user_config['slurm']['nnodes'] = vm.nnodes();
      component.user_config['slurm']['ntasks-per-node'] = vm.ntasks_per_node();
      component.user_config['slurm']['time_recommended'] = vm.time_recommended();

      updateUserConfig();

      vm.submit_job();

    };

    // A callback that is fired on submit?
    component.to_compute_next_step = function() {
      // updateUserConfig();
      component.tab(6);
    };

    component.back = function() {
      var target = component.tab();
      if (component.tab() == 2) {
        target = 0;
      }
      else if (component.tab() == 4) {
        target = 2;
      }
      else if (component.tab() == 7) {
        target = 4;
      } 
      else if (component.tab() == 3) {
        target = 4;
      } 
      else if (component.tab() == 5 && component.timeseries_type() === 'xyce') {
        target = 7;
      }
      else if (component.tab() == 5 && component.timeseries_type() === 'hdf5') {
        target = 3;
      } 
      else
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
