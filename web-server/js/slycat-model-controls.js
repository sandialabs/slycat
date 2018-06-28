/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import client from "js/slycat-web-client";
import markings from "js/slycat-markings";
import ko from "knockout";
import slycatModelControls from "templates/slycat-model-controls.html";

ko.components.register("slycat-model-controls",
{
  viewModel: function(params)
  {
    var component = this;
    component.name = params.name;
    component.description = params.description;
    component.marking = params.marking;
    component.markings = markings.allowed;

    // This is a tad awkward, but a default marking may-or-may-not be available yet.
    if(component.marking() === null)
    {
      component.marking(markings.preselected());
      markings.preselected.subscribe(function()
      {
        component.marking(markings.preselected());
      });
    }
  },
  template: slycatModelControls
});