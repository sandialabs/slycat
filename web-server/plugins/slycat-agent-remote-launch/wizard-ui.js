define(['slycat-server-root', 'slycat-web-client', 'slycat-dialog', 'knockout', 'knockout-mapping'], function(server_root, client, dialog, ko, mapping) {

  function constructor(params) {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.model = mapping.fromJS({ _id: null, name: 'New Agent Remote Launch', description: '', marking: null });
    component.remote = mapping.fromJS({ hostname: null, username: null, password: null, status: null, status_type: null, enable: true, focus: false, sid: null });
    component.remote.focus.extend({ notify: 'always' });
    component.server_root = server_root;
    component.slycatRemoteOption = ko.observable('single-command');
    component.command = ko.observable('');
    component.batch = ko.observable('');
    component.wckey = ko.observable('');
    component.slycatjobs = ko.observableArray([]);
    component.output = ko.observable('Output for the current job will be posted here...');
    component.jid = ko.observable(-1);

    var iid = -1; // window.setInterval() ID
    var batch_path = '';


    component.cancel = function() {
      if (component.remote.sid())
        client.delete_remote({ sid: component.remote.sid() });

      if (component.model._id())
        client.delete_model({ mid: component.model._id() });

      clearInterval(iid);
    };

    component.create_model = function() {
      client.post_project_models({
        pid: component.project._id(),
        type: 'agent-remote-launch',
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function(mid) {
          component.model._id(mid);
          component.tab(1);
          component.remote.focus(true);
        }
      });
    };

    component.connect = function() {
      component.remote.enable(false);
      component.remote.status_type('info');
      component.remote.status('Connecting ...');

      client.post_remotes({
        hostname: component.remote.hostname(),
        username: component.remote.username(),
        password: component.remote.password(),
        success: function(sid) {
          component.remote.sid(sid);
          component.tab(2);
        },
        error: function(request, status, reason_phrase) {
          component.remote.enable(true);
          component.remote.status_type('danger');
          component.remote.status(reason_phrase);
          component.remote.focus('password');
        }
      });
    };

    /** */

    var invalid_form = function() {
      var type = component.slycatRemoteOption();

      if (!component.command().length && type === 'single-command') {
        component.output('A valid command needs to be entered...');
        return true;
      }

      if (!component.batch().length && type === 'batch-file') {
        component.output('A valid file name needs to be entered...');
        return true;
      }

      return false;
    };

    var on_single_command = function() {
      client.post_remote_launch({
        sid: component.remote.sid(),
        command: component.command(),
        success: function(results) {
          if (results.errors)
            component.output('[Error] Command ' + component.command() + ' was not processed correctly: ' + results.errors);
          else
            component.output(results.output);
        }
      });
    };


    var get_job_output = function() {
      client.get_job_output({
        sid: component.remote.sid(),
        jid: component.jid(),
        path: batch_path,
        success: function(results) {
          if (results.errors)
            component.output('[Error] Could not read the job ID=' + component.jid() + ' output: ' + results.errors);
          else
            component.output('The output for job ID=' + component.jid() + ' is:\n\n' + results.output);
        }
      });
    };

    var checkjob = function() {
      client.post_checkjob({
        sid: component.remote.sid(),
        jid: component.jid(),
        success: function(results) {
          if (results.errors) {
            component.output('[Error] Could not check job iD=' + component.jid() + ' status: ' + results.errors);
            return void 0;
          }

          var s = results.status.state;
          component.output('Job ID=' + component.jid() + ' is ' + s);

          if (s === 'COMPLETED') {
            clearInterval(iid);
            get_job_output()
          }
        }
      });
    };

    var on_batch_file = function() {
      client.post_submit_batch({
        sid: component.remote.sid(),
        filename: component.batch(),
        success: function(results) {
          if (results.errors) {
            component.output('[Error] Could not start batch file ' + component.batch() + ': ' + results.errors);
            return void 0;
          }

          component.jid(results.jid);
          component.output('Job ID=' + component.jid() + ' has been submitted.');
          iid = setInterval(checkjob, 1000);
        },
        error: function(request, status, reason_phrase) {
          component.output('[Error] Could not start Batch file ' + component.batch() + ': ' + reason_phrase);
        }
      });
    };

    var on_slycat_fn = function() {

    };

    var callback_map = { 'single-command': on_single_command, 'batch-file': on_batch_file, 'slycat-function': on_slycat_fn };

    component.go_to_output = function() {
      if (invalid_form())
        return void 0;

      component.tab(3);
      callback_map[component.slycatRemoteOption()]();
    };

    /** */

    component.go_to_model = function() {
      location = server_root + 'models/' + component.model._id();
    };

    component.finish = function() {
      client.post_model_finish({
        mid: component.model._id(),
        success: function() {
          component.tab(4);
        }
      });
    };


    return component;
  }

  return {
    viewModel: constructor,
    template: { require: 'text!' + server_root + 'resources/wizards/agent-remote-launch/ui.html' }
  };

});
