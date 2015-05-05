/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-parsers", ["slycat-web-client", "knockout", "knockout-mapping"], function(client, ko, mapping)
{
  var module = {};

  module.available = mapping.fromJS([]);

  client.get_configuration_parsers(
  {
    success: function(parsers)
    {
      parsers.sort(function(left, right)
      {
        return left.label == right.label ? 0 : left.label < right.label ? -1 : 1;
      });
      mapping.fromJS(parsers, module.available);
    },
  });

  return module;
});
