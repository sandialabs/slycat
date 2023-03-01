/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import selectable_markings from "js/slycat-selectable-markings";
import allowed_markings from "js/slycat-markings";
import ko from "knockout";
import slycatModelControls from "templates/slycat-model-controls.html";

ko.components.register("slycat-model-controls", {
  viewModel(params) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const component = this;
    component.name = params.name;
    component.description = params.description;
    component.marking = params.marking;
    component.markings = selectable_markings.allowed;

    // It is possible that the current marking is not a selectable marking.
    // In this case, we need to add it to the list of selectable markings.
    if (
      component.marking() !== null &&
      !component.markings().some((marking) => marking.type() === component.marking())
    ) {
      // console.debug("Adding current marking to list of selectable markings.");
      // Find the matching marking in allowed_markings
      let allowedNotSelectableMarking = allowed_markings
        .allowed()
        .find((marking) => marking.type() === component.marking());
      // Changed allowedNotSelectableMarking's label by appending ' - legacy' to it.
      allowedNotSelectableMarking.label(allowedNotSelectableMarking.label() + " - legacy");
      // Push the matching marking to component.markings
      component.markings.push(allowedNotSelectableMarking);
      // console.debug(`Added marking ${allowedNotSelectableMarking.type()} to list of selectable markings.`);
    }

    // This is a tad awkward, but a default marking may-or-may-not be available yet.
    if (component.marking() === null) {
      component.marking(selectable_markings.preselected());
      selectable_markings.preselected.subscribe(function () {
        component.marking(selectable_markings.preselected());
      });
    }
  },
  template: slycatModelControls,
});
