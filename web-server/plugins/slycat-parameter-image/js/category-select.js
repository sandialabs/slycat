/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

require(["slycat-server-root", "knockout", "knockout-mapping", "lodash"], function(server_root, ko, mapping, _) {

  ko.components.register("slycat-category-select", {
    viewModel: function(params) {
      var self = this;
      self.categories = ko.observableArray();
      self.selectedCategories = ko.observableArray();
      //this.selectedCategories = ko.observableArray(this.categories()); // selected by default

      $.ajax({
          type: "GET",
          url : server_root + "models/" + params.model_id() + "/arraysets/data-table/arrays/0/attributes/" + params.category() + "/chunk?ranges=0,100",
          success : function(result) {
             _(result).uniq().sort().each(function(c) { self.categories.push(c); self.selectedCategories.push(c); }).value(); // selected by default
          },
          error: function(result) {
          }
      });

      this.isSelected = function(category) {
        var category = category; //capture in closure scope
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

    template: ' \
      <div class="bootstrap-styles"> \
        <div data-bind="foreach: categories" class="slycat-category-select btn-group-vertical" role="group" style="position: relative"> \
          <button type="button" class="btn btn-default cat-button" data-bind="text: $data, css: { active: $parent.isSelected($data) }, click: $parent.toggle"> \
          </button> \
        </div> \
      </div> \
    '
  });
});
