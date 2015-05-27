/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

require(["slycat-server-root", "knockout", "knockout-mapping"], function(server_root, ko, mapping)
{
  ko.components.register("slycat-table-ingestion",
  {
  	viewModel: function(params)
    {
      var table = this;
    },
    template: { require: "text!" + server_root + "templates/slycat-table-ingestion.html" }
  });
});