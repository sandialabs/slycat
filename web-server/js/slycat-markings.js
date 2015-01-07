/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-markings", ["slycat-web-client"], function(client)
{
  var markings = ko.mapping.fromJS([]);

  client.get_configuration_markings(
  {
    success: function(results)
    {
      ko.mapping.fromJS(results, markings);
    },
  });

  return markings;
});
