/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

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
