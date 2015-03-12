/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

require(["slycat-server-root", "knockout", "knockout-mapping", "domReady!"], function(server_root, ko, mapping) {

  ko.components.register("slycat-parameter-image-sliders",
  {
    viewModel: function(params)
    {
      this.sliders = params.filters;
      this.length = params.length || ko.observable(400);
    },
    template: { require: "text!" + server_root + "resources/models/parameter-image/parameter-image-sliders.html" }
  }); 

});