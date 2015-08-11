define(['slycat-server-root', 'slycat-web-client', 'slycat-dialog', 'knockout', 'knockout-mapping'], function(server_root, client, dialog, ko, mapping) {

  function constructor(params) {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.model = mapping.fromJS({ _id: null, name: 'New Agent Remote Launch', description: '', marking: null });
    component.remote = mapping.fromJS({ hostname: null, username: null, password: null, status: null, status_type: null, enable: true, focus: false, sid: null });
    component.remote.focus.extend({ notify: 'always' });
    component.server_root = server_root;
    component.command = ko.observable('');
    component.output = ko.observable('Output for the current job will be posted here...');

    component.cancel = function() {
      if (component.remote.sid())
        client.delete_remote({ sid: component.remote.sid() });

      if (component.model._id())
        client.delete_model({ mid: component.model._id() });
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

    /**
     * This is the method to execute the remote command from the user.
     */
    component.go_to_output = function() {
      if (!component.command().length) {
        component.output('A valid command needs to be entered...');
        return void 0;
      }

      client.post_remote_launch({
        sid: component.remote.sid(),
        command: component.command(),
        success: function(results) {
          console.log(results);
          component.output(results.output);
        }
      });

      // component.tab(3);
    };

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