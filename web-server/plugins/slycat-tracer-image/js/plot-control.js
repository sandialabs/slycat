/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
define("PlotControl", ["slycat-server-root", "d3"], function(server_root, d3) {

  function PlotControl(options) {
    var self = this;
    this.plot = options.plot; // TODO: improve the confusing naming/superfluous object layers
    this.model = this.plot.model;
    this.container = options.container; // d3 selection
    this.control_type = options.control_type; // x, y, image, color, etc.
    this.label_text = options.label_text;  // label display text
    this.variables = options.variables; // variables that can be selected
    this.column_names = options.column_names; // set to model.metadata['column-names'] - used to retrieve valid options for the select
    this.selected_variable = null; // currently selected variable
    this.foreign_object = null; // handle to foreignObject so SVG can manipulate
  }

  PlotControl.prototype.build = function() {
    var self = this;

    //build foreignObject SVG container
    self.foreign_object = self.container.append('foreignObject')
      .classed('controls ' + self.control_type + '-control', true) //need a class since d3 can't select foreignObject elements properly in Chrome
      .attr('width', 100) //This gets fixed at the end
      .attr('height', 50);
    var body = self.foreign_object.append('xhtml:body')
          .style('background', 'transparent');

    //build label
    var select_id = self.control_type + '-selector'; // DOM id for the <select>
    var label = body.append('label').attr('for', select_id).text(self.label_text);

    //build select and register event handler
    var select = body.append('select')
          .attr('id', select_id)
          .attr('name', select_id)
          .on('change', function() {
            self.store_selected_variable(this.value);
            self.update_plot(this.value); //pass selected option index
          })
          .on('mousedown', function(){
            d3.event.stopPropagation();
          });

    //build options for select
    self.retrieve_selected_variable();
    //select.empty();
    //select..selectAll('[selected=selected]').attr('selected', null);
    for(var i = 0; i < self.variables.length; i++) {
      $("<option />")
        .text(self.column_names[self.variables[i]])
        .attr("value", self.variables[i])
        .attr("selected", function() {
          if (self.selected_variable == self.variables[i]) {
            //self.update_plot(i); dirty hack: enable if the initial variable select isn't working as expected
            return "selected";
          }
          return false;
        })
        .appendTo(select);
    }

    //Fix the foreign object width after we've drawn the control:
    //Element.clientWidth is different in FF and Chrome, so use offsetWidth instead
    self.foreign_object.attr("width", Math.max(select[0][0].offsetWidth, label[0][0].offsetWidth) + 2);
  };


  PlotControl.prototype.store_selected_variable = function(variable) {
    var self = this;
    // pre-refactor selected_variable_changed() method POSTed to "{{server-root}}events/models/{{_id}}/select/variable/" + variable
    // and bookmarker saved 'variable-selection' state...
    // color_control currently sets control_type to 'v' so it's POSTing to a different path and saving a different key
    // but changing the key shouldn't matter as long as it's retrieved the same way and from examining engine.py and handlers.py
    // it appears that the only effect of this POST is to log client events on the server so all's good
    $.ajax(
      {
        type : "POST",
        url : server_root + "events/models/" + self.model.id + "/select/" + self.control_type + "/" + variable
      });
    state_to_store = {};
    state_to_store[self.control_type + "-selection-" + self.plot.plot_id] = variable;
    self.model.bookmarker.updateState(state_to_store);
  };

  PlotControl.prototype.retrieve_selected_variable = function(variable) {
    var self = this;
    var numeric_variables = self.model.get_numeric_variables();
    this.selected_variable = numeric_variables[0]; //in case there's no bookmark
    var state_to_retrieve =  self.control_type + "-selection-" + self.plot.plot_id;
    if(state_to_retrieve in self.model.bookmark) {
      self.selected_variable = Number(self.model.bookmark[state_to_retrieve]);
    }
  };

  PlotControl.prototype.update_plot = function(variable) {
    var self = this;
    // TODO: either update plot.x_index, etc. here or strip out the index attributes from Scatterplot completely
    // since they become irrelevant once update is called
    var retrieve_func = self.model.get_data_column;
    var callback = function(result){
      var option_to_update = {};
      option_to_update[self.control_type] = result;
      $(self.plot.scatterplot_obj).scatterplot("option", option_to_update);
    }
    if(self.control_type == "images"){
      retrieve_func = self.model.get_image_column;
      var old_callback = callback;
      callback = function(result){
        old_callback(result);
        $(self.plot.plot_ref + " .scatterplot").trigger("images-selection-changed", variable);
      }
    }
    retrieve_func.call(self.model, variable, callback);

    /* NOTE: color variable selection used to conditionally use index instead of fetching variable from server
     but the index was arbitrary and essentially just ended up representing time, which will usually be the first
     csv column and thus default selection anyway

     if(attribute == model.metadata["column-count"] - 1) {
     var count = this.v.length;
     for(var i = 0; i != count; ++i)
     self.v[i] = i;
     $(self.plot_ref + " .scatterplot").scatterplot("option", {v : self.v});
     }
     */
  };

  /*
   For reference, how to translate jquery selection to D3 selection and append:
   var d3controls = d3.select($controls.toArray()); //translate jquery to d3
   self.x_axis_layer.append(function() { return d3controls.node()[0]; });
   */
  return PlotControl;
});
