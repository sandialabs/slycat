/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-markings", ["slycat-web-client", "knockout", "knockout-mapping"], function(client, ko, mapping)
{
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

  return module;
});
