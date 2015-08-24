define('slycat-remote-interface', ['knockout', 'knockout-mapping', 'slycat-server-root', 'URI', 'slycat-web-client'], function(ko, mapping, server_root, URI, client) {

  ko.components.register('slycat-remote-interface', {
    viewModel: function(params) {

      var vm = this;
      vm.remote = mapping.fromJS({ hostname: null, username: null, password: null, status: null, status_type: null, enable: true, focus: false, sid: null });
      vm.remote.focus.extend({ notify: 'always' });
      vm.radio = ko.observable('single-command');
      vm.command = ko.observable('');
      vm.batch = ko.observable('');
      vm.wckey = ko.observable('');
      vm.slycatjobs = ko.observableArray([]);
      vm.output = ko.observable('Output for the current job will be posted here...');
      vm.jid = ko.observable(-1);

      var modal_id = 'slycat-remote-interface-connect-modal';
      var iid = -1; // window.setInterval() ID
      var batch_path = '';


      vm.connect = function() {
        vm.remote.enable(false);
        vm.remote.status_type('info');
        vm.remote.status('Connecting...');

        client.post_remotes({
          hostname: vm.remote.hostname(),
          username: vm.remote.username(),
          password: vm.remote.password(),
          success: function(sid) {
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
      };

      vm.cancel = function() {
        vm.remote.password('');
        $('#' + modal_id).modal('hide');
      };

      var invalid_form = function() {
        var type = vm.radio();

        if (!vm.command().length && type === 'single-command') {
          vm.output('A valid command needs to be entered...');
          return true;
        }

        if (!vm.batch().length && type === 'batch-file') {
          vm.output('A valid file name needs to be entered...');
          return true;
        }

        return false;
      };

      var on_single_command = function() {
        client.post_remote_launch({
          sid: vm.remote.sid(),
          command: vm.command(),
          success: function(results) {
            if (results.errors)
              vm.output('[Error] Command ' + vm.command() + ' was not processed correctly: ' + results.errors);
            else
              vm.output(results.output);
          }
        });
      };

      var get_job_output = function() {
        client.get_job_output({
          sid: vm.remote.sid(),
          jid: vm.jid(),
          path: batch_path,
          success: function(results) {
            if (results.errors)
              vm.output('[Error] Could not read the job ID=' + vm.jid() + ' output: ' + results.errors);
            else
              vm.output('The output for job ID=' + vm.jid() + ' is:\n\n' + results.output);
          }
        });
      };

      var checkjob = function() {
        client.post_checkjob({
          sid: vm.remote.sid(),
          jid: vm.jid(),
          success: function(results) {
            if (results.errors) {
              vm.output('[Error] Could not check job iD=' + vm.jid() + ' status: ' + results.errors);
              return void 0;
            }

            var s = results.status.state;
            vm.output('Job ID=' + vm.jid() + ' is ' + s);

            if (s === 'COMPLETED') {
              clearInterval(iid);
              get_job_output()
            }
          }
        });
      };

      var on_batch_file = function() {
        client.post_submit_batch({
          sid: vm.remote.sid(),
          filename: vm.batch(),
          success: function(results) {
            if (results.errors) {
              vm.output('[Error] Could not start batch file ' + vm.batch() + ': ' + results.errors);
              return void 0;
            }

            vm.jid(results.jid);
            vm.output('Job ID=' + vm.jid() + ' has been submitted.');
            iid = setInterval(checkjob, 1000);
          },
          error: function(request, status, reason_phrase) {
            vm.output('[Error] Could not start Batch file ' + vm.batch() + ': ' + reason_phrase);
          }
        });
      };

      var on_slycat_fn = function() {

      };

      var callback_map = { 'single-command': on_single_command, 'batch-file': on_batch_file, 'slycat-function': on_slycat_fn };

      $('#submit-command').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (invalid_form())
          return void 0;

        if (!vm.remote.sid()) {
          $('#' + modal_id).modal('show');
          return void 0;
        }

        callback_map[vm.radio()]();
      });
    },

    template: { require: 'text!' + server_root + 'templates/slycat-remote-interface.html' }
  });
});
