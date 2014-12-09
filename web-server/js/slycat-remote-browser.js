define("slycat-remote-browser", ["slycat-server-root", "slycat-web-client"], function(server_root, client)
{
  ko.components.register("slycat-remote-browser",
  {
    viewModel: function(params)
    {
      console.log("slycat-remote-browser", ko.mapping.toJS(params));

      var component = this;
      component.type = ko.observable(ko.utils.unwrapObservable(params.type));
      component.sid = ko.observable(ko.utils.unwrapObservable(params.sid));
      component.hostname = ko.observable(ko.utils.unwrapObservable(params.hostname));
      component.path = ko.observable(ko.utils.unwrapObservable(params.path));

      component.full_path = ko.pureComputed(function()
      {
        return component.hostname() + ":" + component.path();
      });

      if(params.data)
        params.data(component);
    },
    template: { require: "text!" + server_root + "templates/slycat-remote-browser.html" }
  });

});
