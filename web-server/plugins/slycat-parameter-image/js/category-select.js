/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

require(["slycat-server-root", "knockout", "knockout-mapping", "lodash"], function(server_root, ko, mapping, _) {

  ko.components.register("slycat-category-select", {
    viewModel: function(params) {
      var self = this;
      self.categories = params.categories;
      self.selectedCategories = ko.observableArray();
      //this.selectedCategories = ko.observableArray(this.categories()); // selected by default
      self.length = params.length || ko.observable(500);

      this.isSelected = function(category) {
        var category = category; //capture in closure scope
        return ko.pureComputed(function() {
          return self.selectedCategories.indexOf(category) !== -1;
        });
      };

      this.toggle = function(category, event) {
        event.currentTarget.classList.add('fresh');
        if(category.selected())
        {
          category.selected(false);
        }
        else
        {
          category.selected(true);
        }
      };

      this.mouseOut = function(category, event) {
        event.currentTarget.classList.remove('fresh');
      }

      this.mouseOver = function(category, event) {
        var ele = event.currentTarget;
        var child = ele.firstElementChild;
        var title = "";
        if(child.clientWidth < child.scrollWidth)
        {
          title = category.value();
        }
        ele.title = title;
      }

      self.style = ko.pureComputed(function()
      {
        var result = {};
        result["height"] = (self.length() + 10) + "px";
        return result;
      });

    },

    template: { require: "text!" + server_root + "resources/pages/parameter-image/slycat-category-select.html" }
  });
});
