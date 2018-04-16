/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define("slycat-dialog", ["slycat-server-root", "slycat-web-client", "knockout", "knockout-mapping", "jquery"], function(server_root, client, ko, mapping, $)
{
  var module = {};

  module.dialog = function(params)
  {
    require(["text!" + server_root + "templates/slycat-alert.html"], function(template)
    {
      var component = {};
      component.close = function(button)
      {
        component.result = button;
        component.container.children().modal("hide");
      }
      component.title = ko.observable(params.title || "Alert");
      component.message = ko.observable(params.message || "");
      component.input = ko.observable(params.input || false);
      component.placeholder = ko.observable(params.placeholder || "");
      component.value = ko.isObservable(params.value) ? params.value : ko.observable(params.value || "");
      component.alert = ko.observable(params.alert || "");
      component.buttons = params.buttons || [{className: "btn-default", label:"OK"}];
      component.container = $($.parseHTML(template)).appendTo($("body"));
      component.container.children().on("hidden.bs.modal", function()
      {
        component.container.remove();
        if(params.callback)
          params.callback(component.result, component.value);
      });
      ko.applyBindings(component, component.container.get(0));
      component.container.children().modal("show");
    });
  }

  module.prompt = function(params)
  {
    module.dialog({
      title: params.title || "Prompt",
      message: params.message || "",
      input: true,
      value: params.value || "",
      alert: params.alert || "",
      buttons: params.buttons || [{className: "btn-default", label: "OK"}, {className: "btn-default", label: "Cancel"}],
      callback: params.callback,
    });
  }

  module.confirm = function(params)
  {
    module.dialog(
    {
      title: params.title || "Confirm",
      message: params.message || "",
      buttons: [{className: "btn-default", label: "Cancel"}, {className: "btn-primary", label: "OK"}],
      callback: function(button)
      {
        if(button.label == "OK")
        {
          if(params.ok)
            params.ok();
        }
        else
        {
          if(params.cancel)
            params.cancel();
        }
      }
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

