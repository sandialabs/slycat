/*
 Copyright 2013, Sandia Corporation. Under the terms of Contract
 DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
 rights in this software.
 */

$.widget("tracerImage.plot_control", {

  options: {
    control_type : null, // x, y, image, color, etc.
    selected_variable : null, // currently displayed variable
    variables : [], // variables that can be selected
    select_id : null, // DOM id for the <select>
    label_text : null, // label display text
    event_to_trigger : null, // name of event to trigger
    column_names : null, // set to model.metadata['column-names'] - used to retrieve valid options for the select
  },

  _create: function() {
    var self = this;
    self.label = $("<label for='" + self.options.select_id + "'>" + self.options.label_text + "</label>").appendTo(self.element);
    self.select = $("<select id='" + self.options.select_id + "' name='" + self.options.select_id + "' />")
      .change(function() {
        self.element.trigger(event_to_trigger, this.value);
      })
      .appendTo(self.element);

    self._build_select_options();
  },

  _build_select_options: function() {
    var self = this;
    self.select.empty();
    for(var i = 0; i < self.options.variables.length; i++) {
      $("<option />")
        .text(self.options.column_names[self.options.variables[i]])
        .attr("value", self.options.variables[i])
        .attr("selected", function() {
          return self.options.selected_variable == self.options.variables[i] ? "selected" : false;
        })
        .appendTo(self.select);
    }
  },

  _set_selected_variable: function() {
    var self = this;
    this.select.val(self.options.variable);
  },

  _setOption: function(key, value) {
    var self = this;
    self.options.key = value;
    if (key == "selected_variable") {
      self._set_selected_variable();
    }
    else if (key == "variables") {
      self._build_select_options();
    }
  }
}
