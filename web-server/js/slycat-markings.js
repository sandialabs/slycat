/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-markings", ["slycat-web-client", "knockout-mapping"], function(client, mapping)
{
  var markings = mapping.fromJS([]);

  client.get_configuration_markings(
  {
    success: function(results)
    {
      mapping.fromJS(results, markings);
    },
  });

  return markings;
});
