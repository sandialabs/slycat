/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

require(["slycat-server-root", "knockout", "knockout-mapping"], function(server_root, ko, mapping) {
  ko.components.register("slycat-category-select", {

    viewModel: function(params) {
      var self = this;
      this.categories = params.categories;
      this.selectedCategories = ko.observableArray();
      this.isSelected = function(category) {
        var category = category;
        return ko.pureComputed(function() {
          return self.selectedCategories.indexOf(category) !== -1;
        });
      };
      this.toggle = function(category) {
        if (self.isSelected(category)()) {
          self.selectedCategories.remove(category);
        }
        else {
          self.selectedCategories.push(category);
        }
      };
    },

    template: { require: "text!" + server_root + "templates/slycat-category-select.html" }
  });
});
