/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import client from "js/slycat-web-client-webpack";
import ko from "knockout";
import mapping from "knockout-mapping";

var module = {};

module.allowed = mapping.fromJS([]);
module.preselected = ko.observable(null);

client.get_configuration_markings(
{
  success: function(markings)
  {
    markings.sort(function(left, right)
    {
      return left.type == right.type ? 0 : left.type < right.type ? -1 : 1;
    });
    mapping.fromJS(markings, module.allowed);
    if(markings.length)
      module.preselected(markings[0].type);
  },
});

export default module;