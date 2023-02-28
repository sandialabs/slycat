/* eslint-disable import/no-import-module-exports */
/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import client from 'js/slycat-web-client';
import ko from 'knockout';
import mapping from 'knockout-mapping';

const module = {};

module.allowed = mapping.fromJS([]);
module.preselected = ko.observable(null);

client.get_selectable_configuration_markings({
  success(markings) {
    markings.sort((left, right) => {
      if (right.type) {
        return 0;
      }
      if (left.type < right.type) {
        return -1;
      }
      return 1;
    });
    mapping.fromJS(markings, module.allowed);
    if (markings.length) {
      module.preselected(markings[0].type);
    }
  }
});

// eslint-disable-next-line import/no-default-export
export default module;
