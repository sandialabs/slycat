define('slycat-remote-interface', ['knockout', 'knockout-mapping', 'slycat-server-root', 'URI', 'slycat-web-client', 'slycat-dialog'], function(ko, mapping, server_root, URI, client, dialog) {

  /**
   * A Knockout component to interact with remote hosts. Currently, for the
   * batch files and Slycat prebuilt functions option, the remote cluster
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
      vm.radio = ko.observable('batch-file');
      vm.command = ko.observable('');
      vm.batch = ko.observable('');

      vm.wckey = ko.observable('');
      vm.nnodes = ko.observable(1);
      vm.partition = ko.observable('');
      vm.ntasks_per_node = ko.observable(1); // This is preset in wizard-ui.html with: suggestions: [{'ntasks_per_node': 8}]
      vm.time_hours = ko.observable(0);
      vm.time_minutes = ko.observable(20);
      vm.time_seconds = ko.observable(0);
      vm.time_recommended = ko.observable(true);
      vm.workdir = ko.observable('');
      vm.retain_hdf5 = ko.observable(false);
      vm.job_size = ko.observable(1000);

      vm.jid = ko.observable(-1);
      vm.agent_function = ko.observable(params.agent_function === undefined ? '' : params.agent_function);
      vm.agent_function_params = params.agent_function_params === undefined ? {} :  params.agent_function_params;
      vm.on_submit_callback = params.on_submit_callback;

      vm.model_type = params.model_type;
      vm.mid = params.mid;

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
          callback_map[vm.radio()]();
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
              callback_map[vm.radio()]();
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
        var type = vm.radio();

        $('.form-group').removeClass('has-error');

        if (!vm.batch().length && type === 'batch-file') {
          alert('A valid file name needs to be entered...');
          $('#form-group-batch-file').addClass('has-error');
          return true;
        }

        if (type === 'slycat-function') {
          var invalid = false;
          var out = '';

          if (vm.wckey() === '') {
            out += '\n' + 'A valid WCID needs to be entered...';
            $('#form-group-wcid').addClass('has-error');
            invalid = true;
          }

          if (vm.nnodes() === undefined || vm.nnodes() === "" || parseInt(vm.nnodes(), 10) < 1) {
            out += '\n' + 'Invalid input for the number of nodes: ' + vm.nnodes() + '.';
            $('#form-group-nnodes').addClass('has-error');
            invalid = true;
          }

          if (vm.partition() === '') {
            out += '\n' + 'A partition needs to be entered...';
            $('#form-group-partition').addClass('has-error');
            invalid = true;
          }

          if (vm.ntasks_per_node() === undefined || vm.ntasks_per_node() === "" || parseInt(vm.ntasks_per_node(), 10) < 1) {
            out += '\n' + 'Invalid input for the number of task(s) per node: ' + vm.ntasks_per_node() + '.';
            $('#form-group-tasks-per-node').addClass('has-error');
            invalid = true;
          }

          var hr = vm.time_hours() === undefined || vm.time_hours() === "" ? 0 : parseInt(vm.time_hours(), 10);
          var min = vm.time_minutes() === undefined || vm.time_minutes() === "" ? 0 : parseInt(vm.time_minutes(), 10);
          var sec = vm.time_seconds() === undefined || vm.time_seconds() === "" ? 0 : parseInt(vm.time_seconds(), 10);

          if (hr < 0 || min < 0 || sec < 0) {
            out += '\n' + 'Negative time is invalid: ' + hr + ':' + min + ':' + sec + '.';
            $('#form-group-time').addClass('has-error');
            invalid = true;
          }

          if ((hr + min + sec) < 1) {
            out += '\n' + 'Zero time is invalid.';
            $('#form-group-time').addClass('has-error');
            invalid = true;
          }

          if (invalid)
            alert(out);

          return invalid;
        }

        return false;
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

      var on_batch_file = function() {
        var uid = generateUniqueId();

        client.post_submit_batch({
          hostname: vm.remote.hostname(),
          filename: vm.batch(),
          success: function(results) {
            if (results.errors) {
              return void 0;
            }

            if (vm.on_submit_callback)
              vm.on_submit_callback();

            vm.jid(results.jid);
            server_checkjob(uid);
          },
          error: function(request, status, reason_phrase) {
            alertt('[Error] Could not start batch file ' + vm.batch() + ': ' + reason_phrase);
          }
        });
      };

      var on_slycat_fn = function() {
        var fn = vm.agent_function()
        var uid = generateUniqueId();

        var fn_params = vm.agent_function_params();
        fn_params.workdir = vm.workdir();

        client.post_agent_function({
          hostname: vm.remote.hostname(),
          wckey: vm.wckey(),
          nnodes: vm.nnodes(),
          partition: vm.partition(),
          ntasks_per_node: vm.ntasks_per_node(),
          time_hours: vm.time_hours() === undefined ? 0 : vm.time_hours(),
          time_minutes: vm.time_minutes() === undefined ? 0 : vm.time_minutes(),
          time_seconds: vm.time_seconds() === undefined ? 0 : vm.time_seconds(),
          fn: fn,
          fn_params: fn_params,
          uid: uid,
          success: function(results) {
            if (results.errors) {
              alert('[Error] Could not start batch file for Slycat pre-built function ' + fn + ': ' + results.errors);
              return void 0;
            }

            if (vm.on_submit_callback)
              vm.on_submit_callback();

            vm.jid(results.jid);
            server_checkjob(uid);
          },
          error: function(request, status, reason_phrase) {
            alert('[Error] Could not start batch file: ' + reason_phrase);
          }
        });
      };

      /** maps the callback functions for the different options/radio buttons  */
      var callback_map = {
        'batch-file': on_batch_file,
        'slycat-function': on_slycat_fn
      };

      vm.submit_job = function() {
        if (invalid_form())
          return void 0;

        if (!vm.remote.hostname()) {
          $('#' + modal_id).modal('show');
          return void 0;
        }

        client.get_session_status({
          hostname: vm.remote.hostname(),
          success: function(results) {
            if (results.errors)
              return void 0

            callback_map[vm.radio()]();
          },
          error: function(request, status, reason_phrase) {
            vm.remote.password('');
            $('#' + modal_id).modal('show');
          }
        });

        return void 0;
      };

      $('.slycat-remote-interface-custom-field').on('focus', function(e) {
        $('#slycat-remote-interface-prebuilt').prop('checked', false);
        $('#slycat-remote-interface-custom').prop('checked', true);
        vm.radio('batch-file');
      });

      $('.slycat-remote-interface-prebuilt-field').on('focus', function(e) {
        $('#slycat-remote-interface-custom').prop('checked', false);
        $('#slycat-remote-interface-prebuilt').prop('checked', true);
        vm.radio('slycat-function');
      });
    },

    template: { require: 'text!' + server_root + 'templates/slycat-remote-interface.html' }
  });
});
