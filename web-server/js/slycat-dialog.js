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

  // added select drop down, returns value index
  // (S. Martin, 11/27/2019)
  component.select = ko.observable(params.select || false);

  // set up options list with an index id
  var select_options = []
  if (typeof params.select_options !== 'undefined') {
    var select_option_data = function(data){
      var self = this;
      self.id = ko.observable(data.id);
      self.name = ko.observable(data.name);
    };
    for (var i = 0; i < params.select_options.length; i++) {
      select_options.push(new select_option_data({id: i,
        name: params.select_options[i]}))
    }
  }
  component.options = ko.observableArray(select_options);

  component.placeholder = ko.observable(params.placeholder || "");
  component.value = ko.isObservable(params.value) ? params.value : ko.observable(params.value || "");
  component.alert = ko.observable(params.alert || "");
  component.buttons = params.buttons || [{className: "btn-primary", label:"OK"}];
  component.container = $($.parseHTML(template)).appendTo($("body"));
  component.container.children().on("hidden.bs.modal", function()
  {
    // console.debug(`This fires when the dialog is closed.`);
    component.container.remove();
    if(params.callback)
      params.callback(component.result, component.value);

    // Check if there are other modals open, and add back the 'modal-open' class
    // to the body tag. This class is removed when a modal closes, but is needed
    // if there are other modals still open because otherwise scrolling inside
    // remaining modals breaks.
    if ($('.modal:visible').length) {
      $('body').addClass('modal-open');
    }
  });
  ko.applyBindings(component, component.container.get(0));
  component.container.children().modal("show");
}

export function prompt(params)
{
  dialog({
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
  dialog(
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