define("slycat-dialog", ["slycat-server-root", "knockout", "jquery"], function(server_root, ko, $)
{
  var module = {};

  module.dialog = function(params)
  {
    require(["text!" + server_root + "templates/slycat-alert.html"], function(template)
    {
      var component = {};
      component.close = function()
      {
        component.container.children().modal("hide");
      }
      component.title = ko.observable(params.title || "Alert");
      component.message = ko.observable(params.message || "");
      component.buttons = [{className: "btn-default", label:"OK", action:component.close}];
      component.container = $($.parseHTML(template)).appendTo($("body"));
      component.container.children().on("hidden.bs.modal", function()
      {
        component.container.remove();
        if(params.callback)
          params.callback();
      });
      ko.applyBindings(component, component.container.get(0));
      component.container.children().modal("show");
    });
  }

  module.ajax_error = function(message)
  {
    return function(request, status, reason_phrase)
    {
      module.dialog(
      {
        message: message + " " + reason_phrase
      });
    }
  }

  return module;
});
