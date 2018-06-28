/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import ko from "knockout";
import slycatLocalBrowser from "templates/slycat-local-browser.html";

ko.components.register("slycat-local-browser",
{
  viewModel: function(params)
  {
    var component = this;
    component.selection = params.selection;
    component.disabled = params.disabled === undefined ? false : params.disabled;
    component.multiple = params.multiple == true ? 'multiple' : null; // Set multiple parameter to true if you want multiple file selection enabled
    component.progress = params.progress != undefined ? params.progress : ko.observable(undefined);
    component.progress_status = params.progress_status != undefined ? params.progress_status : ko.observable('');
    component.selection_changed = function(model, event)
    {
      component.selection(event.target.files);
    }
  },
  template: slycatLocalBrowser
});