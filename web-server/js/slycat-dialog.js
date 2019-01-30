/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import ko from 'knockout';
import template from 'templates/slycat-alert.html';

export function dialog(params)
{
  let component = {};
  component.close = function(button)
  {
    component.result = button;
    component.container.children().modal("hide");
  };
  component.title = ko.observable(params.title || "Alert");
  component.message = ko.observable(params.message || "");
  component.input = ko.observable(params.input || false);
  component.placeholder = ko.observable(params.placeholder || "");
  component.value = ko.isObservable(params.value) ? params.value : ko.observable(params.value || "");
  component.alert = ko.observable(params.alert || "");
  component.buttons = params.buttons || [{className: "btn-primary", label:"OK"}];
  component.container = $($.parseHTML(template)).appendTo($("body"));
  component.container.children().on("hidden.bs.modal", function()
  {
    component.container.remove();
    if(params.callback)
      params.callback(component.result, component.value);
  });
  ko.applyBindings(component, component.container.get(0));
  component.container.children().modal("show");
}

export function prompt(params)
{
  this.dialog({
    title: params.title || "Prompt",
    message: params.message || "",
    input: true,
    value: params.value || "",
    alert: params.alert || "",
    buttons: params.buttons || [{className: "btn-primary", label: "OK"}, {className: "btn-light", label: "Cancel"}],
    callback: params.callback,
  });
}

export function confirm(params)
{
  this.dialog(
  {
    title: params.title || "Confirm",
    message: params.message || "",
    buttons: [{className: "btn-light", label: "Cancel"}, {className: "btn-primary", label: "OK"}],
    callback: function(button)
    {
      if(button.label === "OK")
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

export function ajax_error(message)
{
  return function(request, status, reason_phrase)
  {
    dialog(
    {
      message: message + " " + reason_phrase
    });
  }
}