/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import api_root from "js/slycat-api-root";
import * as dialog from "js/slycat-dialog";
import _ from "lodash";
import ko from "knockout";
import mapping from "knockout-mapping";
import "js/jquery.scrollintoview.min";

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
  self.allFilters = null;
  self.active_filters = null;
  self.active_filters_ready = ko.observable(false);
  self.foundMismatches = false;

  // Looks up the variable's label in the Redux store and returns it 
  // if it exists. Otherwise just returns the variable's column name from metadata.
  self.get_variable_label = function(variable)
  {
    let label;
    if(window.store.getState().derived.variableAliases[variable] !== undefined)
    {
      label= window.store.getState().derived.variableAliases[variable];
    }
    else
    {
      label = self.table_metadata["column-names"][variable];
    }
    // Using he package to encode label text otherwise slickgrid will 
    // execute <scrpt> tags in it and choke on other code
    // return he.encode(label);
    return label;
  }

  // Updates allFilters with variable labels if they exist
  self.update_variable_aliases = () => {
    self.allFilters().forEach(function(filter){
      filter.name(self.get_variable_label(filter.index()));
    });
  };
};

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
FilterManager.prototype.set_table_statistics = function(table_statistics) {
  this.table_statistics = table_statistics;
};

/* Until AJAX handling is refactored, have to manually pass data at different times. Extremely ugly,
   but it makes these dependencies explicit and thus will be easier to decouple later. */
FilterManager.prototype.notify_controls_ready = function() {
  this.controls_ready = true;
};

FilterManager.prototype.notify_store_ready = function() {
  window.store.subscribe(this.update_variable_aliases);
};

FilterManager.prototype.build_sliders = function(controls_ready) {
  var self = this;

  if(!self.sliders_ready && self.controls_ready && self.table_metadata && self.table_statistics 
    && (self.table_statistics.length == self.table_metadata["column-count"]) && self.other_columns) 
  {
    self.sliders_ready = true;
    $("#sliders-pane .load-status").css("display", "none");

    var variable_order = self.input_columns.concat(self.output_columns, self.rating_columns, self.category_columns, self.other_columns);
    var numeric_variables = [];
    for (var i = 0; i < self.table_metadata["column-count"]; i++) {
      if (self.table_metadata["column-types"][i] != 'string' && !(_.includes(self.category_columns, i)) && self.table_metadata["column-count"]-1 > i) {
        numeric_variables.push(i);
      }
    }

    self.allFilters = ko.observableArray();
    var numericFilters, categoryFilters, activeFilters;

    // have to be built after allFilters is assigned, and it's reassigned from bookmark,
    // so call this from both conditional clauses
    var buildComputedFilters = function(filters) {
      activeFilters = ko.pureComputed(function() {
        return _.filter(filters(), function(f) { return f.active(); });
      });
      // activeFilters = filters.filter(function(f) { return f.active(); });
      self.active_filters = ko.pureComputed(function() {
          return _.filter(filters(), function(f) { return f.active(); });
        })
        .extend({ rateLimit: { timeout: 0, method: "notifyWhenChangesStop" } })
        ;
      numericFilters = ko.pureComputed(function() {
        return _.filter(filters(), function(f) { return f.type() === 'numeric'; });
      });
      categoryFilters = ko.pureComputed(function() {
        return _.filter(filters(), function(f) { return f.type() === 'category'; });
      });
    };

    var buildCategoryFilter = function(index){
      var categories = ko.observableArray();
      self.allFilters.push({
        name: ko.observable( self.get_variable_label(index) ),
        type: ko.observable('category'),
        index: ko.observable( index ),
        active: ko.observable(false),
        categories: categories,
        selected: ko.pureComputed( function(){ 
            return _.filter(categories(), function(category) { return category.selected() === true; });
          })
          .extend({ rateLimit: { timeout: 0, method: "notifyWhenChangesStop" } })
          ,
        autowidth: ko.observable(false),
        nulls: ko.observable(false),
        order: ko.observable( variable_order.indexOf(index) ) 
      });
    };

    var buildNumericFilter = function(index){
      var high = ko.observable( self.table_statistics[index]["max"] );
      var low = ko.observable( self.table_statistics[index]["min"] );
      self.allFilters.push({
        name: ko.observable( self.get_variable_label(index) ),
        type: ko.observable('numeric'),
        index: ko.observable( index ),
        max_stats: ko.observable( self.table_statistics[index]["max"] ),
        min_stats: ko.observable( self.table_statistics[index]["min"] ),
        max: ko.observable( self.table_statistics[index]["max"] ).extend({ notify: 'always' }),
        min: ko.observable( self.table_statistics[index]["min"] ).extend({ notify: 'always' }),
        high: high,
        low: low,
        invert: ko.observable(false),
        active: ko.observable(false),
        nulls: ko.observable(false),
        order: ko.observable( variable_order.indexOf(index) ),
        rateLimitedHigh: ko.pureComputed(high).extend({ rateLimit: { timeout: rateLimit, method: "notifyWhenChangesStop" } }),
        rateLimitedLow: ko.pureComputed(low).extend({ rateLimit: { timeout: rateLimit, method: "notifyWhenChangesStop" } }),
      });
    };

    var rateLimit = 500;
    if ("allFilters" in self.bookmark) {
      self.allFilters = mapping.fromJS(self.bookmark["allFilters"]);

      // Can't trust that bookmark contains accurate variable labels, so 
      // updating them here based on what's in the redux store.
      self.update_variable_aliases();

      // Can't trust that bookmark contains accurate categorical/numeric type information, so must verify here
      for(var i=self.allFilters().length-1; i >= 0; i--) 
      {
        var filter = self.allFilters()[i];
        if(filter.type() == 'category' && self.category_columns.indexOf(filter.index()) == -1)
        {
          // Mismatch
          self.allFilters.splice(i, 1);
          buildNumericFilter(filter.index());
          self.foundMismatches = true;
        }
        else if(filter.type() == 'numeric' && numeric_variables.indexOf(filter.index()) == -1)
        {
          // Mismatch
          self.allFilters.splice(i, 1);
          buildCategoryFilter(filter.index());
          self.foundMismatches = true;
        }
      }

      buildComputedFilters(self.allFilters);

      _.each(numericFilters(), function (filter) {
        filter.max.extend({ notify: 'always' });
        filter.min.extend({ notify: 'always' });
        filter.rateLimitedHigh = ko.pureComputed( filter.high ).extend({ rateLimit: { timeout: rateLimit, method: "notifyWhenChangesStop" } });
        filter.rateLimitedLow = ko.pureComputed( filter.low ).extend({ rateLimit: { timeout: rateLimit, method: "notifyWhenChangesStop" } });
        // Add max_stats and min_stats if they do not exists because bookmark is old
        if( !('max_stats' in filter) )
        {
          filter.max_stats = ko.observable( self.table_statistics[ filter.index() ]["max"] );
        }
        if( !('min_stats' in filter) )
        {
          filter.min_stats = ko.observable( self.table_statistics[ filter.index() ]["min"] );
        }
      });

      _.each(categoryFilters(), function (filter) {
        filter.selected = ko.pureComputed( function(){ 
            return _.filter(filter.categories(), function(category) { return category.selected() === true; });
          })
          .extend({ rateLimit: { timeout: 0, method: "notifyWhenChangesStop" } })
          ;
      });
      if(self.foundMismatches)
      {
        self.bookmarker.updateState( {"allFilters" : mapping.toJS(self.allFilters())} );
      }
    }
    else {
      _.each(self.category_columns, buildCategoryFilter);

      _.each(numeric_variables, buildNumericFilter);

      buildComputedFilters(self.allFilters);
    }

    var ViewModel = function(params) {
      var vm = this;
      self.slidersPaneHeight( $("#sliders-pane").innerHeight() );
      vm.model_id = ko.observable(self.model_id);
      vm.sliderHeight = ko.pureComputed(function() {
        return self.slidersPaneHeight() - 95;
      }, this);
      vm.thumb_length = ko.observable(12);
      vm.allFilters = self.allFilters;
      vm.numericFilters = numericFilters;
      vm.categoryFilters = categoryFilters;
      vm.activeFilters = activeFilters;
      vm.availableFilters = ko.observableArray(
        vm.allFilters.slice(0).sort(function(one, two) {
          return one.order() < two.order() ? -1 : 1;
        })
      );

      if (vm.activeFilters().length > 0) {
        self.layout.open("west");
      }

      _.each(vm.numericFilters(), function (filter) {
        filter.rateLimitedHigh.subscribe(function(newValue) {
          // console.log("rateLimitedHighValue is: " + newValue);
          self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
        });
        filter.rateLimitedLow.subscribe(function(newValue) {
          // console.log("rateLimitedLowValue is: " + newValue);
          self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
        });
      });

      _.each(vm.categoryFilters(), function (filter) {
        filter.categories.subscribe(function(newValue) {
          self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
        });
        filter.selected.subscribe(function(newValue) {
          self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
        });
      });

      vm.activateFilter = function(item, event) {
        if (vm.activeFilters().length === 0) {
          self.layout.open("west");
        }
        var activateFilter = event.target.dataset.value;
        var filter, targetFilter, filterType, categories;
        for(var i = vm.allFilters().length-1; i >= 0; i--)
        {
          filter = vm.allFilters()[i];
          if (filter.index() == Number(activateFilter)) {
            filterType = filter.type();
            targetFilter = vm.allFilters.remove(filter)[0];
            if(filterType == 'category' && targetFilter.categories().length == 0)
            {
              categories = ko.observableArray();
              $.ajax({
                type: "GET",
                url : api_root + "models/" + vm.model_id() + "/arraysets/data-table/metadata?unique=0/" + targetFilter.index() + "/...",
                success : function(result) {
                   _(result.unique[0].values[0]).sort().each(function(c) { targetFilter.categories.push({value: ko.observable(c), selected: ko.observable(true)}); }).value(); // selected by default
                  // Bookmark once all unique values are set
                  self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
                },
                error: function(result) {
                }
              });
            }
            // Move it to the end of the array
            vm.allFilters.push( targetFilter );
            // Show it
            targetFilter.active(true);
          }
        }
        $("#sliders-pane #sliders .slycat-pim-filter:last-child").get(0).scrollIntoView();
        self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
      };
      vm.removeFilter = function(filter, event) {
        filter.active(false);
        if (vm.activeFilters().length == 0) {
          self.layout.close("west");
        }
        self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
      };
      vm.toggleAutoWidth = function(filter, event) {
        if(filter.autowidth())
        {
          filter.autowidth(false);
        }
        else
        {
          filter.autowidth(true);
        }
        self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
      };
      vm.toggleNull = function(filter, event) {
        if(filter.nulls())
        {
          filter.nulls(false);
        }
        else
        {
          filter.nulls(true);
        }
        self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
      };
      vm.invertFilter = function(filter, event) {
        if(filter.type() === 'numeric')
        {
          filter.invert( !filter.invert() );
          self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
        }
        else if(filter.type() === 'category') 
        {
          _.each(filter.categories(), function(category){
            if(category.selected())
            {
              category.selected(false);
            }
            else
            {
              category.selected(true);
            }
          });
        }
      };
      vm.selectAll = function(filter, event) {
        _.each(filter.categories(), function(category){
            category.selected(true);
        });
      };
      vm.selectNone = function(filter, event) {
        _.each(filter.categories(), function(category){
            category.selected(false);
        });
      };
      vm.maxMinKeyPress = function(filter, event) {
        // console.log("maxMin has keypress. event.which is: " + event.which);
        // Want to capture enter key on keypress and prevent it from adding new lines.
        // Instead, it needs to start validation and saving of new value.
        if(event.which == 13)
        {
          // Enter key was pressed, so we need to validate
          // console.log("enter key was pressed.");
          event.target.blur();

          return false;
        }
        // Detecting escape key does not seem to work with keypress event, at least not in Firefox.
        // Instead, we catch escape key with the keyup event.
        // else if(event.which == 27)
        // {
        //   // escape key was pressed, so we need to validate
        //   console.log("escape key was pressed");
        //   return false;
        // }
        else
          return true;
      };
      vm.maxMinKeyUp = function(filter, event) {
        // console.log("maxMin has keyup. event.which is: " + event.which);
        // Detecting escape key here on keyup because it doesn't work reliably on keypress.
        if(event.which == 27)
        {
          // escape key was pressed, so we need to validate
          // console.log("escape key was pressed.");
          event.target.blur();
          return false;
        }
        else
        {
          return true;
        }
      };
      vm.maxMinFocus = function(filter, event) {
        var textContent = "";
        if( $(event.target).hasClass("max-field") )
        {
          textContent = this.max();
        }
        else if( $(event.target).hasClass("min-field") )
        {
          textContent = this.min();
        }
        else if( $(event.target).hasClass("high_value") )
        {
          textContent = this.high();
        }
        else if( $(event.target).hasClass("low_value") )
        {
          textContent = this.low();
        }
        $(event.target).toggleClass("editing", true);
        event.target.textContent = textContent;
        // console.log("maxMin has focus.");
      };
      vm.maxMinBlur = function(filter, event) {
        var newValue = Number(event.target.textContent);
        var max_limit, min_limit;
        if( $(event.target).hasClass("max-field") )
        {
          max_limit = filter.max_stats();
          min_limit = filter.min();
        }
        else
        {
          max_limit = filter.max();
          min_limit = filter.min_stats();
        }
        if ( isNaN(newValue) || newValue > max_limit || newValue < min_limit )
        {
          // console.log("validation failed");
          dialog.dialog({
            title: isNaN(newValue) ? "Oops, Please Enter A Number" : "Oops, Number Outside Of Data Range",
            message: "Please enter a number between " + min_limit + " and " + max_limit + ".",
            buttons: [
              {className: "btn-primary",  label:"OK"}
            ],
            callback: function(button)
            {
              if(button.label == "OK")
                $(event.target).focus();
            },
          });
        }
        else
        {
          $(event.target).toggleClass("editing", false);
          if( $(event.target).hasClass("max-field") )
          {
            if(this.low() > newValue)
            {
              this.low(newValue);
            }
            if(this.high() > newValue)
            {
              this.high(newValue);
            }
            this.max(newValue);
          }
          else
          {
            if(this.high() < newValue)
            {
              this.high(newValue);
            }
            if(this.low() < newValue)
            {
              this.low(newValue);
            }
            this.min(newValue);
          }
          self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
        }
        // console.log("maxMin lost focus.");
      };
      vm.highLowBlur = function(filter, event) {
        var newValue = Number(event.target.textContent);
        var max_limit, min_limit;
        if( $(event.target).hasClass("high_value") )
        {
          max_limit = filter.max();
          min_limit = filter.low();
        }
        else
        {
          max_limit = filter.high();
          min_limit = filter.min();
        }
        if ( isNaN(newValue) || newValue > max_limit || newValue < min_limit )
        {
          // console.log("validation failed");
          dialog.dialog({
            title: isNaN(newValue) ? "Oops, Please Enter A Number" : "Oops, Number Outside Of Data Range",
            message: "Please enter a number between " + min_limit + " and " + max_limit + ".",
            buttons: [
              {className: "btn-primary",  label:"OK"}
            ],
            callback: function(button)
            {
              if(button.label == "OK")
              {
                $(event.target).focus();
              }
            },
          });
        }
        else
        {
          $(event.target).toggleClass("editing", false);
          if( $(event.target).hasClass("high_value") )
          {
            this.high(newValue);
          }
          else
          {
            this.low(newValue);
          }
          self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
        }
        // console.log("high or low lost focus.");
      };
      vm.maxMinMouseOver = function(filter, event) {
        $(event.target).toggleClass("hover", true);
        // console.log("maxMin mouse over.");
      };
      vm.maxMinMouseOut = function(filter, event) {
        $(event.target).toggleClass("hover", false);
        // console.log("maxMin mouse out.");
      };
      vm.maxMinReset = function(filter, event) {
        if( $(event.target).hasClass("max-reset") )
        {
          if(this.high() > this.max_stats())
          {
            this.high( this.max_stats() );
          }
          this.max(this.max_stats());
        }
        else
        {
          if(this.low() < this.min_stats())
          {
            this.low( this.min_stats() );
          }
          this.min(this.min_stats());
        }
          
        self.bookmarker.updateState( {"allFilters" : mapping.toJS(vm.allFilters())} );
        // console.log("maxMin reset.");
      };

    };

    ko.applyBindings(
      new ViewModel(),
      document.getElementById('parameter-image-plus-layout')
    );

    self.active_filters_ready(true);
    if(self.foundMismatches)
    {
      self.allFilters.valueHasMutated();
    }
  }
};

export default FilterManager;