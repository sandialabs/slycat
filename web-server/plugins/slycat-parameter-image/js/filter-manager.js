define("slycat-parameter-image-filter-manager", ["slycat-server-root", "lodash", "knockout", "knockout-mapping", "jquery"], function(server_root, _,  ko, mapping, $) {

  function FilterManager(model_id, bookmarker, layout, input_columns, output_columns, image_columns, rating_columns, category_columns) {
    var self = this;

    self.model_id = model_id;
    self.bookmarker = bookmarker;
    self.layout = layout;
    self.input_columns = input_columns;
    self.output_columns = output_columns;
    self.image_columns = image_columns;
    self.rating_columns = rating_columns;
    self.category_columns = category_columns;
    self.other_columns = null;
    self.sliders_ready = false;
    self.slidersPaneHeight = ko.observable();
    self.controls_ready = false;
  }

  /* Until AJAX handling is refactored, have to manually pass data at different times. Extremely ugly,
     but it makes these dependencies explicit and thus will be easier to decouple later. */
  FilterManager.prototype.set_bookmark = function(bookmark) {
    this.bookmark = bookmark;
  };

  /* Until AJAX handling is refactored, have to manually pass data at different times. Extremely ugly,
     but it makes these dependencies explicit and thus will be easier to decouple later. */
  FilterManager.prototype.set_other_columns = function(other_columns) {
    this.other_columns = other_columns;
  };

  /* Until AJAX handling is refactored, have to manually pass data at different times. Extremely ugly,
     but it makes these dependencies explicit and thus will be easier to decouple later. */
  FilterManager.prototype.set_table_metadata = function(table_metadata) {
    this.table_metadata = table_metadata;
  };

  /* Until AJAX handling is refactored, have to manually pass data at different times. Extremely ugly,
     but it makes these dependencies explicit and thus will be easier to decouple later. */
  FilterManager.prototype.notify_controls_ready = function() {
    this.controls_ready = true;
  };

  FilterManager.prototype.build_sliders = function(controls_ready) {
    var self = this;
    if (!self.sliders_ready && self.controls_ready && self.table_metadata) {
      self.sliders_ready = true;
      $("#sliders-pane .load-status").css("display", "none");

      var variable_order = self.input_columns.concat(self.output_columns, self.rating_columns, self.category_columns, self.other_columns);
      var numeric_variables = [];
      for (var i = 0; i < self.table_metadata["column-count"]; i++) {
        if (self.table_metadata["column-types"][i] != 'string' && self.table_metadata["column-count"]-1 > i) {
          numeric_variables.push(i);
        }
      }

      var allFilters = ko.observableArray();
      var rateLimit = 500;
      if ("allFilters" in self.bookmark) {
        allFilters = mapping.fromJS(self.bookmark["allFilters"]);
        for(var i=0; i < allFilters().length; i++) {
          allFilters()[i].rateLimitedHigh = ko.pureComputed( allFilters()[i].high ).extend({ rateLimit: { timeout: rateLimit, method: "notifyWhenChangesStop" } });
          allFilters()[i].rateLimitedLow = ko.pureComputed( allFilters()[i].low ).extend({ rateLimit: { timeout: rateLimit, method: "notifyWhenChangesStop" } });
        }
      }
      else {
        for (var i = 0; i < numeric_variables.length; i++) {
          var high = ko.observable( self.table_metadata["column-max"][numeric_variables[i]] );
          var low = ko.observable( self.table_metadata["column-min"][numeric_variables[i]] );
          allFilters.push({
            name: ko.observable( self.table_metadata["column-names"][numeric_variables[i]] ),
            index: ko.observable( numeric_variables[i] ),
            max: ko.observable( self.table_metadata["column-max"][numeric_variables[i]] ),
            min: ko.observable( self.table_metadata["column-min"][numeric_variables[i]] ),
            high: high,
            low: low,
            invert: ko.observable(false),
            active: ko.observable(false),
            order: ko.observable( variable_order.indexOf(numeric_variables[i]) ),
            rateLimitedHigh: ko.pureComputed(high).extend({ rateLimit: { timeout: rateLimit, method: "notifyWhenChangesStop" } }),
            rateLimitedLow: ko.pureComputed(low).extend({ rateLimit: { timeout: rateLimit, method: "notifyWhenChangesStop" } }),
          });
        }
      }

      var ViewModel = function(params) {
        var vm = this;
        self.slidersPaneHeight( $("#sliders-pane").innerHeight() );
        vm.sliderHeight = ko.pureComputed(function() {
          return self.slidersPaneHeight() - 95;
        }, this);
        vm.thumb_length = ko.observable(12);
        vm.allFilters = allFilters;
        vm.availableFilters = ko.observableArray(
          vm.allFilters.slice(0).sort(function(one, two) {
            return one.order() < two.order() ? -1 : 1;
          })
        );
        vm.activeFilters = vm.allFilters.filter(function(filter) {
          return filter.active();
        });
        if (vm.activeFilters().length > 0) {
          self.layout.open("west");
        }

        for (var i = 0; i < vm.allFilters().length; i++) {
          vm.allFilters()[i].rateLimitedHigh.subscribe(function(newValue) {
            // console.log("rateLimitedHighValue is: " + newValue);
            self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
          });
          vm.allFilters()[i].rateLimitedLow.subscribe(function(newValue) {
            // console.log("rateLimitedLowValue is: " + newValue);
            self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
          });
        }

        vm.activateFilter = function(item, event) {
          if (vm.activeFilters().length == 0) {
            self.layout.open("west");
          }
          var activateFilter = event.target.value;
          for(var i = 0; i < vm.allFilters().length; i++) {
            if (vm.allFilters()[i].index() == Number(activateFilter)) {
              var activate = vm.allFilters()[i];
              // Move it to the end of the array
              vm.allFilters.push( vm.allFilters.remove(activate)[0] );
              // Show it
              activate.active(true);
            }
          }
          event.target.selectedIndex = 0;
          $("#sliders-pane #sliders .slycat-pim-filter:last-child").get(0).scrollIntoView();
          self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
        };
        vm.removeFilter = function(item, event) {
          var filterIndex = vm.allFilters.indexOf(item);
          vm.allFilters()[filterIndex].active(false);
          if (vm.activeFilters().length == 0) {
            self.layout.close("west");
          }
          self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
        };
        vm.invertFilter = function(item, event) {
          var filterIndex = vm.allFilters.indexOf(item);
          vm.allFilters()[filterIndex].invert( !vm.allFilters()[filterIndex].invert() );
          self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
        };
      };

      ko.applyBindings(
        new ViewModel(),
        document.getElementById('parameter-image-plus-layout')
      );
    }
  };

  return FilterManager;
});
