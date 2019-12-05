/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import URI from "urijs";
import ko from "knockout";
import mapping from "knockout-mapping";
import slycatRemoteInterface from "templates/slycat-remote-interface.html";

/**
 * A Knockout component to interact with remote hosts. Currently the remote cluster
 * should have SLURM (Simple Linux Utility for Resource Management) installed
 * and configured.
 */
ko.components.register('slycat-remote-interface', {
  viewModel: function(params) {

    var vm = this;
    vm.disabled = params.disabled === undefined ? false : params.disabled;
    vm.nnodes_disabled = params.disabled === undefined ? false : params.disabled;
    vm.remote = mapping.fromJS({ hostname: null, username: null, password: null, status: null, status_type: null, enable: true, focus: false, sid: null, session_exists: false });
    vm.remote.sid = params.sid;
    vm.remote.hostname = params.hostname;
    vm.remote.username = params.username;
    vm.remote.password = params.password;
    vm.remote.session_exists = params.session_exists;
    vm.remote.focus.extend({ notify: 'always' });
    vm.command = ko.observable('');

    vm.wckey = ko.observable('');
    vm.nnodes = ko.observable(2);
    vm.partition = ko.observable('');
    vm.ntasks_per_node = ko.observable(2); // This is preset in wizard-ui.html with: suggestions: [{'ntasks_per_node': 2}]
    vm.job_size = ko.observable(1000);
    vm.time_hours = ko.observable(0);
    vm.time_minutes = ko.observable(20);
    vm.time_seconds = ko.observable(0);
    vm.time_recommended = ko.observable(true);
    vm.workdir = ko.observable('');
    vm.retain_hdf5 = ko.observable(false);

    vm.jid = ko.observable(-1);
    vm.working_directory = ko.observable('');
    vm.agent_function = ko.observable(params.agent_function === undefined ? '' : params.agent_function);
    vm.agent_function_params = params.agent_function_params === undefined ? {} :  params.agent_function_params;
    vm.on_submit_callback = params.on_submit_callback;
    vm.on_error_callback = params.on_error_callback;

    vm.model_type = params.model_type;
    vm.mid = params.mid;

    vm.retain_hdf5.subscribe(function(newValue){
      var timeseries_wizard = ko.dataFor($('.slycat-timeseries-wizard')[0]);

      if(newValue == false && vm.agent_function_params().timeseries_type == 'hdf5' && timeseries_wizard.tab() == 5)
      {
        dialog.confirm({
          title: 'Delete HDF5 Input Files?',
          message: 'Unchecking this will delete your hdf5 input files once the model completes. Are you sure you want to continue?',
          ok: function(){

          },
          cancel: function(){
            vm.retain_hdf5(true);
          }
        });
      }
    });

    var modal_id = 'slycat-remote-interface-connect-modal';
    var select_id = 'slycat-remote-interface-agent-functions';

    // Process suggestions if any
    (function() {
      var suggestions = params.suggestions === undefined ? [] : params.suggestions;
      suggestions.forEach(function(s) {
        var key = Object.keys(s)[0];
        vm[key](s[key]);
      });
    })();

    // Process restrictions if any
    (function() {
      var restrictions = params.restrictions === undefined ? [] : params.restrictions;
      restrictions.forEach(function(r) {
        var key = Object.keys(r)[0];
        vm[key](r[key]);
        vm[key + '_disabled'] = true;
      });
    })();

    vm.set_job_time = function() {
      client.job_time({
        nodes: vm.nnodes(),
        tasks: vm.ntasks_per_node(),
        size: vm.job_size(),
        success: function(result) {
          var nodes = parseInt(result.nodes);
          var tasks = parseInt(result.tasks);
          var size = parseInt(result.size);
          if(nodes == vm.nnodes() && tasks == vm.ntasks_per_node() && size == vm.job_size() && vm.time_recommended())
          {
            var total_seconds = parseInt(result['time-seconds']);
            var hours = Math.floor(total_seconds / 3600);
            var minutes = Math.floor((total_seconds - (hours * 3600)) / 60);
            var seconds = total_seconds - (hours * 3600) - (minutes * 60);
            vm.time_hours(hours);
            vm.time_minutes(minutes);
            vm.time_seconds(seconds);
          }
        },
        error: function(request, status, reason_phrase) {
          // On error we should uncheck the "Use recommended values" checkbox
          vm.time_recommended(false);
        }
      });
    };
    vm.conditionally_set_job_time = function() {
      if(vm.time_recommended())
      {
        vm.set_job_time();
      }
    };
    vm.time_recommended.subscribe(function() {
      vm.conditionally_set_job_time();
    });
    vm.nnodes.subscribe(function() {
      vm.conditionally_set_job_time();
    });
    vm.ntasks_per_node.subscribe(function() {
      vm.conditionally_set_job_time();
    });

    // Set initial job time
    (function() {
      vm.conditionally_set_job_time();
    })();

    vm.connect = function() {
      vm.remote.enable(false);
      vm.remote.status_type('info');
      vm.remote.status('Connecting...');

      if(vm.remote.session_exists())
      {
        $('#' + modal_id).modal('hide');
        on_slycat_fn();
      }
      else
      {
        client.post_remotes({
          hostname: vm.remote.hostname(),
          username: vm.remote.username(),
          password: vm.remote.password(),
          success: function(sid) {
            vm.remote.session_exists(true);
            vm.remote.sid(sid);
            $('#' + modal_id).modal('hide');
            on_slycat_fn();
          },
          error: function(request, status, reason_phrase) {
            vm.remote.enable(true);
            vm.remote.status_type('danger');
            vm.remote.status(reason_phrase);
            vm.remote.focus('password');
          }
        });
      }
    };

    vm.cancel = function() {
      vm.remote.password('');
      $('#' + modal_id).modal('hide');
    };

    var invalid_form = function() {
      $('.form-group').removeClass('is-invalid');

      var invalid = false;
      var out = '';

      if (vm.wckey().trim() === '') {
        out += '\n' + 'Please enter a valid WCID.';
        $('#form-group-wcid').addClass('is-invalid');
        invalid = true;
      }

      if (vm.partition().trim() === '') {
        out += '\n' + 'Please enter a partition.';
        $('#form-group-partition').addClass('is-invalid');
        invalid = true;
      }

      if (vm.nnodes() === undefined || vm.nnodes() === "" || !Number.isInteger(Number(vm.nnodes())) || parseInt(vm.nnodes(), 10) < 1) {
        out += '\n' + 'Number of nodes must be an integer of 1 or greater.';
        $('#form-group-nnodes').addClass('is-invalid');
        invalid = true;
      }

      if (vm.ntasks_per_node() === undefined || vm.ntasks_per_node() === "" || !Number.isInteger(Number(vm.ntasks_per_node())) || parseInt(vm.ntasks_per_node(), 10) < 1) {
        out += '\n' + 'Number of tasks / node(s) must be an integer of 1 or greater.';
        $('#form-group-tasks-per-node').addClass('is-invalid');
        invalid = true;
      }

      if( !Number.isInteger(Number(  vm.time_hours())) || !Number.isInteger(Number(vm.time_minutes())) || !Number.isInteger(Number(vm.time_seconds())) )
      {
        out += '\n' + 'Please enter a valid time.';
        $('#form-group-time').addClass('is-invalid');
        invalid = true;
      }

      var hr  = vm.time_hours()   === undefined || vm.time_hours()   === "" ? null : parseInt(vm.time_hours(),   10);
      var min = vm.time_minutes() === undefined || vm.time_minutes() === "" ? null : parseInt(vm.time_minutes(), 10);
      var sec = vm.time_seconds() === undefined || vm.time_seconds() === "" ? null : parseInt(vm.time_seconds(), 10);

      if (hr == null || min == null || sec == null || hr < 0 || min < 0 || sec < 0 || ((hr + min + sec) < 1)) {
        out += '\n' + 'Please enter a valid time.';
        $('#form-group-time').addClass('is-invalid');
        invalid = true;
      }

      if (vm.workdir().trim() === '') {
        out += '\n' + 'Please enter a working directory.';
        $('#form-group-workdir').addClass('is-invalid');
        invalid = true;
      }

      if (invalid)
        alert(out);

      return invalid;
    };

    var server_checkjob = function(uid) {
      if (!vm.mid)
        return void 0;

      client.put_model_parameter({
        mid: vm.mid(),
        aid: 'jid',
        value: vm.jid(),
        input: true
      });

      client.post_sensitive_model_command({
        mid: vm.mid(),
        type: vm.model_type,
        command: "checkjob",
        parameters: {
          working_directory: vm.working_directory(),
          jid: vm.jid(),
          fn: vm.agent_function(),
          hostname: vm.remote.hostname(),
          username: vm.remote.username(),
          password: vm.remote.password(),
          fn_params: vm.agent_function_params(),
          uid: uid
        },
        error: dialog.ajax_error("There was a problem checking job status from the server:")
      });
    };

    var generateUniqueId = function() {
      var d = Date.now();
      var uid = 'xxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = (d + Math.random() * 16) % 16 | 0;
          d = Math.floor(d / 16);
          return (c === 'x' ? r : (r&0x3|0x8)).toString(16);
      });

      return uid;
    };

    var on_slycat_fn = function() {
      var fn = vm.agent_function();
      var uid = generateUniqueId();

      var fn_params = vm.agent_function_params();
      fn_params.workdir = vm.workdir();
      fn_params.retain_hdf5 = vm.retain_hdf5();

      var fn_params_copy = $.extend(true, {}, fn_params);

      if(fn_params.timeseries_type !== 'csv')
      {
        // Blank out timeseries_name
        fn_params_copy.timeseries_name = "";

      }
      var json_payload =
      {
        "scripts": [
        ],
        "hpc": {
            "is_hpc_job": true,
            "parameters": {
                "wckey" : vm.wckey(),
                "nnodes" : vm.nnodes(),
                "partition" : vm.partition(),
                "ntasks_per_node" : vm.ntasks_per_node(),
                "time_hours" : vm.time_hours() === undefined ? 0 : vm.time_hours(),
                "time_minutes" : vm.time_minutes() === undefined ? 0 : vm.time_minutes(),
                "time_seconds" : vm.time_seconds() === undefined ? 0 : vm.time_seconds(),
                "working_dir" : fn_params.workdir + "/slycat/"
            }
        }
      };

      var hdf5_dir = fn_params.workdir + "/slycat/" + uid + "/" + "hdf5/";
      var pickle_dir = fn_params.workdir + "/slycat/" + uid + "/" + "pickle/";

      if (fn_params.timeseries_type === "csv")
      {
        json_payload.scripts.push({
            "name": "timeseries_to_hdf5",
            "parameters": [
                {
                    "name": "--output-directory",
                    "value": hdf5_dir
                },
                {
                    "name": "--id-column",
                    "value": fn_params.id_column
                },
                {
                    "name": "--inputs-file",
                    "value": fn_params.inputs_file
                },
                {
                    "name": "--inputs-file-delimiter",
                    "value": fn_params.inputs_file_delimiter
                },
                {
                    "name": "--force",
                    "value": ""
                }
            ]
        });
      }
      else if(fn_params.timeseries_type === "xyce")
      {
        json_payload.scripts.push({
            "name": "xyce_timeseries_to_hdf5",
            "parameters": [
                {
                    "name": "--output-directory",
                    "value": hdf5_dir
                },
                {
                    "name": "--id-column",
                    "value": fn_params.id_column
                },
                {
                    "name": "--timeseries-file",
                    "value": fn_params.xyce_timeseries_file
                },
                {
                    "name": "--input-directory",
                    "value": fn_params.input_directory
                },
                {
                    "name": "--force",
                    "value": ""
                }
            ]
        });
      }
          // # check if we have a pre-set hdf5 directory
          // if "hdf5_directory" in params and params["hdf5_directory"] != "":
          //     hdf5_dir = params["hdf5_directory"]

      if (fn_params.timeseries_type === "csv")
      {
        json_payload.scripts.push({
            "name": "compute_timeseries",
            "parameters": [
                {
                    "name": "--directory",
                    "value": hdf5_dir
                },
                {
                    "name": "--timeseries-name",
                    "value": fn_params.timeseries_name
                },
                {
                    "name": "--cluster-sample-count",
                    "value": fn_params.cluster_sample_count
                },
                {
                    "name": "--cluster-sample-type",
                    "value": fn_params.cluster_sample_type
                },
                {
                    "name": "--cluster-type",
                    "value": fn_params.cluster_type
                },
                {
                    "name": "--cluster-metric",
                    "value": fn_params.cluster_metric
                },
                {
                    "name": "--workdir",
                    "value": pickle_dir
                },
                {
                    "name": "--hash",
                    "value": uid
                }
            ]
        });
      }
      else
      {
        json_payload.scripts.push({
              "name": "compute_timeseries",
              "parameters": [
                  {
                      "name": "--directory",
                      "value": hdf5_dir
                  },
                  {
                      "name": "--cluster-sample-count",
                      "value": fn_params.cluster_sample_count
                  },
                  {
                      "name": "--cluster-sample-type",
                      "value": fn_params.cluster_sample_type
                  },
                  {
                      "name": "--cluster-type",
                      "value": fn_params.cluster_type
                  },
                  {
                      "name": "--cluster-metric",
                      "value": fn_params.cluster_metric
                  },
                  {
                      "name": "--workdir",
                      "value": pickle_dir
                  },
                  {
                      "name": "--hash",
                      "value": uid
                  }
              ]
          });
      }

      client.post_remote_command({
        hostname: vm.remote.hostname(),
        command: json_payload,
        success: function(results) {
          if (!results.errors) {
            alert('[Error] Could not start batch file for Slycat pre-built function ' + fn + ': ' + results.errors);
            vm.on_error_callback();
            return void 0;
          }

          if (vm.on_submit_callback)
            vm.on_submit_callback();
          const splitResult = results.errors.replace(/(\r\n\t|\n|\r\t)/gm,"").split(" ");
          const jid =  splitResult[splitResult.length-1];
          vm.jid(jid);
          vm.working_directory(fn_params.workdir + "/slycat/" + uid + "/");
          server_checkjob(uid);
        },
        error: function(request, status, reason_phrase) {
          alert('[Error] Could not start batch file: ' + reason_phrase);
          vm.on_error_callback();
        }
      });
    };

    vm.submit_job = function() {
      if (invalid_form())
      {
        vm.on_error_callback();
        return void 0;
      }

      if (!vm.remote.hostname()) {
        $('#' + modal_id).modal('show');
        vm.on_error_callback();
        return void 0;
      }

      client.get_session_status({
        hostname: vm.remote.hostname(),
        success: function(results) {
          if (results.errors)
          {
            vm.on_error_callback();
            return void 0;
          }

          on_slycat_fn();
        },
        error: function(request, status, reason_phrase) {
          vm.remote.password('');
          $('#' + modal_id).modal('show');
          vm.on_error_callback();
        }
      });

      return void 0;
    };

  },

  template: slycatRemoteInterface
});