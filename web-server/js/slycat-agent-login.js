define("slycat-agent-login", ["knockout", "slycat-server-root", "slycat-web-client"], function(ko, server_root, web_client){
  var viewModel = {
    title: ko.observable("Login to begin an agent session"),
    remote: {
      hostname: ko.observable(""),
      username: ko.observable(""),
      password: ko.observable(""),
      error: ko.observable(),
    },
    agentIds: {},
    cancel: function(element){
      return function(){
      }
    },
    connect: function(element){
      return function(){
        $(element).find('button').prop('disabled', true);
        viewModel.remote.error("");
        var data = {};
        $.each(viewModel.remote, function(k,v){data[k] = v();});
        web_client.post_agents({
          data: data,
          success: function(result){
              viewModel.agentIds[viewModel.remote.hostname()] = ko.observable(result.sid);
              viewModel.callback(viewModel.agentIds[viewModel.remote.hostname()]());
              $(element).modal('hide');
            },
          error: function(request, status, reason_phrase){
              viewModel.remote.error(reason_phrase);
            },
          complete: function(){
              $(element).find('button').prop('disabled', false);
            }
        })
      }
    }
  };

  ko.components.register("slycat-agent-login",
  {
    viewModel: function(params)
    {
      subModel = viewModel;
      this.remote = viewModel.remote;
      this.connect = viewModel.connect;
      this.cancel = viewModel.cancel;
      this.title = params.title;
    },
    template: { require: "text!" + server_root + "templates/slycat-agent-login.html"}
  });

  var module = {};

  module.build = function(element, params){
    $.each(params || {}, function(k,v){
        ko.isObservable(viewModel[k]) ? viewModel[k](v) : viewModel[k] = v;
      });
    viewModel.element = element;
    viewModel.cancel = viewModel.cancel(element);
    viewModel.connect = viewModel.connect(element);
    $(element).on('shown.bs.modal', function(){ $(element).find(viewModel.remote.username() ? "#slycat-remote-password" : "#slycat-remote-username").focus(); });
    $(element).on('hide', function(){viewModel.callback = null;});
    ko.applyBindings(viewModel, element);
    return this;
  }

  module.remote = function(value){
    if(value) {
      $.each(value, function(k,v){viewModel.remote[k](v);})
    }
    return this;
  }

  //Read-only access to agent ids:
  module.hasAgentId = function(hostname){
    return (viewModel.agentIds[hostname] && true) || false;
  }

  module.agentId = function(hostname, callback){
    viewModel.remote.hostname(hostname);
    if(viewModel.agentIds[hostname]){
      callback(viewModel.agentIds[hostname]());
      return;
    }
    viewModel.callback = callback;
    $(viewModel.element).modal('show');
  }

  module.clearAgentId = function(hostname){
    viewModel.agentIds[hostname] = null;
  }

  return module;
});
