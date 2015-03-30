/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

require(["slycat-server-root", "knockout", "knockout-mapping", "lodash"], function(server_root, ko, mapping, _) {
  ko.components.register("slycat-category-select", {

    viewModel: function(params) {
      var select = this;
      select.categories = params.categories;
      select.selectedCategories = ko.observableArray();
      select.length = params.length || ko.observable(500);

      $.ajax({
          type: "GET",
          url : server_root + "models/" + params.model_id() + "/arraysets/data-table/arrays/0/attributes/" + params.category() + "/chunk?ranges=0,100",
          success : function(result) {
             _(result).uniq().sort().each(function(c) { select.categories.push(c); select.selectedCategories.push(c); }).value(); // selected by default
          },
          error: function(result) {
          }
      });

      select.isSelected = function(category) {
        var category = category;
        return ko.pureComputed(function() {
          return select.selectedCategories.indexOf(category) !== -1;
        });
      };
      select.toggle = function(category) {
        if (select.isSelected(category)()) {
          select.selectedCategories.remove(category);
        }
        else {
          select.selectedCategories.push(category);
        }
      };
      select.style = ko.pureComputed(function()
      {
        var result = {};
        result["height"] = select.length() + "px";
        return result;
      });
    },

    template: { require: "text!" + server_root + "templates/slycat-category-select.html" }
  });
});
