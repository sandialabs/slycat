define('slycat-job-checker', ['knockout', 'knockout-mapping', 'slycat-server-root', 'URI', 'slycat-web-client', 'slycat-dialog'], function(ko, mapping, server_root, URI, client, dialog) {
  ko.components.register('slycat-job-checker', {
    viewModel: function(params) {
      var vm = this;
      vm.remote = mapping.fromJS({ hostname: null, username: null, password: null, status: null, status_type: null, enable: true, focus: false, sid: null, session_exists: false });
      vm.remote.focus.extend({ notify: 'always'  });
      vm.jid = ko.observable(-1);
      vm.output = ko.observable('Output for the current job will be posted here...');
      var iid = -1; // window.setInterval() ID
      var previous_state = '';

      vm.connect = function() {
        vm.remote.enable(false);
        vm.remote.status_type('info');
        vm.remote.status('Connecting...');
        if(vm.remote.session_exists())
        {
          vm.remote.enable(true);
          vm.remote.status_type(null);
          vm.remote.status(null);
          $('#slycat-job-checker-connect-modal').modal('hide');
          $('#slycat-job-checker-cancel').removeAttr('disabled');
          vm.checkjob();
        }
        else{
            client.post_remotes({
              hostname: vm.remote.hostname(),
              username: vm.remote.username(),
              password: vm.remote.password(),
              success: function(sid) {
                vm.remote.session_exists(true);
                vm.remote.sid(sid);
                vm.remote.enable(true);
                vm.remote.status_type(null);
                vm.remote.status(null);
                $('#slycat-job-checker-connect-modal').modal('hide');
                $('#slycat-job-checker-cancel').removeAttr('disabled');
                vm.checkjob();
              },
              error: function(request, status, reason_phrase) {
                $('#slycat-job-checker-cancel').attr('disabled');
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
        $('#slycat-job-checker-connect-modal').modal('hide');
        vm.output(vm.output() + '\n' + 'Please reload the page to check job ' + vm.jid() + '\'s status.');
      };

      var get_job_output = function() {
        client.get_job_output({
          sid: vm.remote.sid(),
          jid: vm.jid(),
          path: '',
          success: function(results) {
            if (results.errors)
              vm.output(vm.output() + '\n' + '[Error] Could not read the job ID=' + vm.jid() + ' output: ' + results.errors);
            else
              vm.output(vm.output() + '\n' + 'The output for job ID=' + vm.jid() + ' is:\n\n' + results.output);

            vm.output(vm.output() + '\n\n' + 'Please reload to view model.');
          }
        });
      };

      var repeated_state = function(state) {
        return previous_state === state ? true : false;
      };

      var routine = function(jid) {
		client.post_checkjob({
          sid: vm.remote.sid(),
          jid: vm.jid(),
          success: function(results) {
            if (results.errors) {
              vm.output(vm.output() + '\n' + '[Error] Could not check job iD=' + vm.jid() + ' status: ' + results.errors);
              return void 0;
            }

            var s = results.status.state;

            if (!repeated_state(s))
              vm.output(vm.output() + '\n' + 'Job ID=' + vm.jid() + ' is ' + s);
            else
              vm.output(vm.output() + '.');

            if (s === 'COMPLETED' || s === 'FAILED') {
              clearInterval(iid);
              get_job_output();
              previous_state = '';
            }

            if (s === 'CANCELLED' || s === 'REMOVED') {
              clearInterval(iid);
              previous_state = '';
            }

            previous_state = s;
          },
          error: function(request, status, reason_phrase) {
            vm.output(vm.output() + '\n' + '[Error] Could not check job status: ' + status + ' :' + reason_phrase);
          }
        });
      };

      vm.checkjob = function() {
        previous_state = '';
        iid = setInterval(routine, 1000);
      };

      vm.set_jid = function(jid) {
        vm.jid(jid);
      };

      $('#slycat-job-checker-connect').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        $('#slycat-job-checker-connect-modal').modal();
      });

			$('#slycat-job-checker-clear').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        vm.output('');
      });

      $('#slycat-job-checker-cancel').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        client.post_cancel_job({
          sid: vm.remote.sid(),
          jid: vm.jid()
        });
      });
    },
    template: { require: 'text!' + server_root + 'templates/slycat-job-checker.html' }
  })

});
