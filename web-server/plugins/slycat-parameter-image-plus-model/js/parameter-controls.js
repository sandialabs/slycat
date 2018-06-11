/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

import server_root from "js/slycat-server-root";
import * as dialog from "js/slycat-dialog-webpack";
import "jquery-ui";

$.widget("parameter_image.controls",
{
  options:
  {
    "server-root" : "",
    mid : null,
    model_name : null,
    aid : null,
    metadata : null,
    // cluster_index : null,
    "x-variable" : null,
    "y-variable" : null,
    "image-variable" : null,
    "color-variable" : null,
    "auto-scale" : true,
    // clusters : [],
    x_variables : [],
    y_variables : [],
    image_variables : [],
    color_variables : [],
    rating_variables : [],
    category_variables : [],
    selection : [],
    hidden_simulations : [],
    indices : [],
  },

  _create: function()
  {
    var self = this;

    // if(self.options.clusters.length > 0)
    // {
    //   this.cluster_label = $("<label for='cluster-switcher'>Cluster:</label>")
    //     .appendTo(this.element)
    //     ;
    //   this.cluster_select = $("<select id='cluster-switcher' name='cluster-switcher' />")
    //     .change(function(){
    //       self.element.trigger("cluster-selection-changed", this.value);
    //     })
    //     .appendTo(this.element)
    //     ;
    // }

    this.x_label = $("<label for='x-axis-switcher'>X Axis:</label>")
      .appendTo(this.element)
      ;
    this.x_select = $("<select id='x-axis-switcher' name='x-axis-switcher' />")
      .change(function(){
        self.element.trigger("x-selection-changed", this.value);
      })
      .appendTo(this.element)
      ;

    this.y_label = $("<label for='y-axis-switcher'>Y Axis:</label>")
      .appendTo(this.element)
      ;
    this.y_select = $("<select id='y-axis-switcher' name='y-axis-switcher' />")
      .change(function(){
        self.element.trigger("y-selection-changed", this.value);
      })
      .appendTo(this.element)
      ;

    if(this.options.image_variables != null && this.options.image_variables.length > 0)
    {
      this.images_label = $("<label for='images-switcher'>Image Set:</label>")
        .appendTo(this.element)
        ;
      this.images_select = $("<select id='images-switcher' name='images-switcher' />")
        .change(function(){
          self.element.trigger("images-selection-changed", this.value);
        })
        .appendTo(this.element)
        ;
    }

    this.color_label = $("<label for='color-variable-switcher'>Point Color:</label>")
      .appendTo(this.element)
      ;
    this.color_select = $("<select id='color-variable-switcher' name='color-variable-switcher' />")
      .change(function(){
        self.element.trigger("color-selection-changed", this.value);
      })
      .appendTo(this.element)
      ;

    this.selection_label = $("<label for='selection-control'>Selection:</label>")
      .appendTo(this.element)
      ;
    this.selection_select = $("<select id='selection-control' name='selection-control' />")
      .change(function(){

        var selectedOption = $('option:selected', this);
        var label = selectedOption.attr("label");
        var text = selectedOption.text();
        var value = this.value;
        if(label == 'set' || label == 'clear')
        {
          var variableLabel = selectedOption.parent().attr('label');
          if(label == 'set')
          {
            openSetValueDialog(variableLabel, value);
          }
          else if(label == 'clear')
          {
            openClearValueDialog(variableLabel, value);
          }

        }
        else if(value == 'hide')
        {
          self.element.trigger("hide-selection", self.options.selection);
        }
        else if(value == 'show')
        {
          self.element.trigger("show-selection", self.options.selection);
        }
        else if(value == 'pin')
        {
          self.element.trigger("pin-selection", self.options.selection);
        }
        this.selectedIndex = 0;
      })
      .appendTo(this.element)
      ;

    this.show_all_button = $("<button>Show All</button>")
      .click(function(){
        self.element.trigger("show-all");
      })
      .appendTo(this.element)
      ;
    
    this.auto_scale = $("<input id='auto-scale-option' name='auto-scale-option' value='auto-scale' type='checkbox' checked='true'>")
      .change(function(){
        self.element.trigger("auto-scale", this.checked);
      })
      .appendTo(this.element)
      ;

    this.auto_scale_label = $("<label for='auto-scale-option'>Auto Scale</label>")
      .appendTo(this.element)
      ;

    this.csv_button = $("<button>Download Data Table</button>")
    	.click(function(){
        if (self.options.selection.length == 0 && self.options.hidden_simulations.length == 0) {
    	    self._write_data_table();
    	  } else {
          openCSVSaveChoiceDialog();
        }
    	})
    	.appendTo(this.element)
    	;

    $('#set-value-form').dialog({
      modal: true,
      autoOpen: false,
      buttons: {
        'Apply': function() {
          //$('#mainForm input#target').val( $(this).find('#widgetName').val() );
          var variableIndex = $('input#variable-index', this).val();
          var value = $('input#value', this).val().trim();
          var numeric = self.options.metadata["column-types"][variableIndex] != "string";
          var valueValid = value.length > 0;
          if( valueValid && numeric && isNaN(Number(value)) ) {
            valueValid = false;
          }
          if(valueValid) {
            self.element.trigger("set-value", {
              selection : self.options.selection, 
              variable : variableIndex, 
              value : numeric ? value : '"' + value + '"',
            });
            $(this).dialog('close');
          } else {
            var message = "Please enter a value.";
            if(numeric)
              message = "Please enter a numeric value.";
            $('.dialogErrorMessage', this).text(message);
          }
          
        },
        'Cancel': function() {
          $(this).dialog('close');
        },
      },
    });

    $('#clear-value-form').dialog({
      modal: true,
      autoOpen: false,
      buttons: {
        'Clear': function() {
          var variableIndex = $('input#variable-index', this).val();
          self.element.trigger("set-value", {selection : self.options.selection, variable : variableIndex, value : NaN});
          $(this).dialog('close');
        },
        'Cancel': function() {
          $(this).dialog('close');
        },
      },
    });

    self.save_choice_buttons = {
      'Save The Whole Table': function() {
         self._write_data_table();
        //$(this)._write_data_table();  //what's the diff with above?
        $(this).dialog('close');
      },
      'Save Visible Rows': function() {
         self._write_data_table( self._filterIndices() );
        //$(this)._write_data_table();  //what's the diff with above?
        $(this).dialog('close');
      },
      'Save Selected Rows': function() {
        self._write_data_table( self.options.selection );
        $(this).dialog('close');
      },
      'Cancel': function() {
        $(this).dialog('close');
      },
    };

    $('#csv-save-choice-form').dialog({
      modal: true,
      autoOpen: false,
      buttons: self.save_choice_buttons,
    });


    function openSetValueDialog(variable, variableIndex){
      $("#set-value-form #set-value-form-variable").text(variable);
      $("#set-value-form input").attr('value','');
      $("#set-value-form input#variable-index").attr('value', variableIndex);
      $("#set-value-form .dialogErrorMessage").empty();
      $("#set-value-form").dialog("open");
    }
    function openClearValueDialog(variable, variableIndex){
      $("#clear-value-form #clear-value-form-variable").text(variable);
      $("#set-value-form input").attr('value','');
      $("#clear-value-form input#variable-index").attr('value', variableIndex);
      $("#clear-value-form").dialog("open");
    }
    function openCSVSaveChoiceDialog(){
      var txt = "";

      if(self.options.selection.length > 0)
      {
        txt += "You have " + self.options.selection.length + " rows selected. ";
      }
      if(self.options.hidden_simulations.length > 0)
      {
        var visibleRows = self.options.metadata['row-count'] - self.options.hidden_simulations.length;
        txt += "You have " + visibleRows + " rows visible. ";
      }

      txt += "What would you like to do?";
      $("#csv-save-choice-form #csv-save-choice-label").text(txt);

      var buttons = $.extend({}, self.save_choice_buttons);
      if(self.options.selection.length == 0)
      {
        delete buttons["Save Selected Rows"];
      }
      if(self.options.hidden_simulations.length == 0)
      {
        delete buttons["Save Visible Rows"];
      }
      $("#csv-save-choice-form").dialog("option", "buttons", buttons);

      $("#csv-save-choice-form").dialog("open");
    }

    // if(self.options.clusters.length > 0)
    // {
    //   self._set_clusters();
    // }
    self._set_x_variables();
    self._set_y_variables();
    self._set_image_variables();
    self._set_color_variables();
    self._set_auto_scale();
    self._set_selection_control();
    self._set_show_all();
  },


  _write_data_table: function(selectionList)
  {
    var self = this;
    $.ajax(
    {
      type : "POST",
      url : server_root + "models/" + self.options.mid + "/arraysets/" + self.options.aid + "/data",
      data: JSON.stringify({"hyperchunks": "0/.../..."}),
      contentType: "application/json",
      success : function(result)
      {
        self._write_csv( self._convert_to_csv(result, selectionList), self.options.model_name + "_data_table.csv" );
      },
      error: function(request, status, reason_phrase)
      {
        window.alert("Error retrieving data table: " + reason_phrase);
      }
    });
  },

  _write_csv: function(csvData, defaultFilename)
  {
    var self = this;
    var D = document;
    var a = D.createElement("a");
    var strMimeType = "text/plain";
    var defaultFilename = defaultFilename || "slycatDataTable.csv";

    //build download link:
    a.href = "data:" + strMimeType + ";charset=utf-8," + encodeURIComponent(csvData);  //encodeURIComponent() handles all special chars

    if ('download' in a) { //FF20, CH19
      a.setAttribute("download", defaultFilename);
      a.innerHTML = "downloading...";
      D.body.appendChild(a);
      setTimeout(function() {
        var e = D.createEvent("MouseEvent");
	e.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
	a.dispatchEvent(e);
	D.body.removeChild(a);
      }, 66);
      return true;
    } else {   // end if('download' in a)
      console.log("++ firefox/chrome detect failed");
    }
/*
    if (window.MSBlobBuilder) { // IE10
      console.log( "doing the IE10 stuff" );
      var bb = new MSBlobBuilder();
      bb.append(strData);
      return navigator.msSaveBlob(bb, strFileName);
    }

    //do iframe dataURL download: (older W3)
    console.log( "doing the older W3 stuff" );
    var f = D.createElement("iframe");
    D.body.appendChild(f);
    f.src = "data:" + (A[2] ? A[2] : "application/octet-stream") + (window.btoa ? ";base64" : "") + "," + (window.btoa ? window.btoa : escape)(strData);
    setTimeout(function() {
      D.body.removeChild(f);
    }, 333);
    return true;
*/
  },

  _convert_to_csv: function(array, sl)
  {
    // Note that array.data is column-major:  array.data[0][*] is the first column
    var self = this;
    var selectionList = sl || [];
    var numRows = array[0].length;
    var numCols = array.length;
    var rowMajorOutput = "";
    var r, c, value;
    // add the headers
    for(c=0; c<numCols; c++) {
      rowMajorOutput += self.options.metadata["column-names"][c] + ",";
    }
    rowMajorOutput = rowMajorOutput.slice(0, -1); //rmv last comma
    rowMajorOutput += "\n";
    // add the data
    for(r=0; r<numRows; r++) {
      if(selectionList.length == 0 || selectionList.indexOf(r) > -1)
      {
        for(c=0; c<numCols; c++) {
          value = array[c][r];
          if(value === null)
          {
            value = NaN;
          }
          rowMajorOutput += value + ",";
        }
        rowMajorOutput = rowMajorOutput.slice(0, -1); //rmv last comma
        rowMajorOutput += "\n";
      }
    }
    return rowMajorOutput;
  },

  // _set_clusters: function()
  // { 
  //   var self = this;
  //   this.cluster_select.empty();
  //   for(var i = 0; i < this.options.clusters.length; i++) {
  //     $("<option />")
  //       .text(this.options.clusters[i])
  //       .attr("value", i)
  //       .attr("selected", function(){
  //         return self.options.cluster_index == i ? "selected" : false;
  //       })
  //       .appendTo(this.cluster_select)
  //       ;
  //   }
  // },

  _set_x_variables: function()
  { 
    var self = this;
    this.x_select.empty();
    for(var i = 0; i < this.options.x_variables.length; i++) {
      $("<option />")
        .text(this.options.metadata['column-names'][this.options.x_variables[i]])
        .attr("value", this.options.x_variables[i])
        .attr("selected", function(){
          return self.options["x-variable"] == self.options.x_variables[i] ? "selected" : false;
        })
        .appendTo(this.x_select)
        ;
    }
  },

  _set_y_variables: function()
  { 
    var self = this;
    this.y_select.empty();
    for(var i = 0; i < this.options.y_variables.length; i++) {
      $("<option />")
        .text(this.options.metadata['column-names'][this.options.y_variables[i]])
        .attr("value", this.options.y_variables[i])
        .attr("selected", function(){
          return self.options["y-variable"] == self.options.y_variables[i] ? "selected" : false;
        })
        .appendTo(this.y_select)
        ;
    }
  },

  _set_image_variables: function()
  { 
    var self = this;
    if(this.options.image_variables != null && this.options.image_variables.length > 0)
    {
      this.images_select.empty();
      for(var i = 0; i < this.options.image_variables.length; i++) {
        $("<option />")
          .text(this.options.metadata['column-names'][this.options.image_variables[i]])
          .attr("value", this.options.image_variables[i])
          .attr("selected", function(){
            return self.options["image-variable"] == self.options.image_variables[i] ? "selected" : false;
          })
          .appendTo(this.images_select)
          ;
      }
    }
    
  },

  _set_color_variables: function()
  { 
    var self = this;
    this.color_select.empty();
    for(var i = 0; i < this.options.color_variables.length; i++) {
      $("<option />")
        .text(this.options.metadata['column-names'][this.options.color_variables[i]])
        .attr("value", this.options.color_variables[i])
        .attr("selected", function(){
          return self.options["color-variable"] == self.options.color_variables[i] ? "selected" : false;
        })
        .appendTo(this.color_select)
        ;
    }
  },

  _set_auto_scale: function()
  { 
    var self = this;
    this.auto_scale.prop("checked", self.options["auto-scale"]);
  },

  _set_selection_control: function()
  { 
    var self = this;
    this.selection_select.empty();
    // Start with empty option
    $("<option />")
      .text("Pick Action")
      .appendTo(this.selection_select)
      ;

    // Add options for ratings and categories
    for(var i = 0; i < this.options.rating_variables.length; i++)
    {
      var optgroup = $("<optgroup />")
        .attr("label", this.options.metadata['column-names'][this.options.rating_variables[i]])
        .appendTo(this.selection_select)
        ;
      $("<option />")
        .text("Set")
        .attr("value", this.options.rating_variables[i])
        .attr("label", "set")
        .appendTo(optgroup)
        ;
      // Disabling clear functionality for ratings since it causes problems with nulls
      // $("<option />")
      //   .text("Clear")
      //   .attr("value", this.options.rating_variables[i])
      //   .attr("label", "clear")
      //   .appendTo(optgroup)
      //   ;
    }

    for(var i = 0; i < this.options.category_variables.length; i++)
    {
      var optgroup = $("<optgroup />")
        .attr("label", this.options.metadata['column-names'][this.options.category_variables[i]])
        .appendTo(this.selection_select)
        ;
      $("<option />")
        .text("Set")
        .attr("value", this.options.category_variables[i])
        .attr("label", "set")
        .appendTo(optgroup)
        ;
      $("<option />")
        .text("Clear")
        .attr("value", this.options.category_variables[i])
        .attr("label", "clear")
        .appendTo(optgroup)
        ;
    }
      
    // Finish with global actions
    var scatterplotOptgroup = $("<optgroup />")
      .attr("label", "Scatterplot Points")
      .appendTo(this.selection_select)
      ;
    $("<option />")
      .text("Hide")
      .attr("value", "hide")
      .appendTo(scatterplotOptgroup)
      ;
    $("<option />")
      .text("Show")
      .attr("value", "show")
      .appendTo(scatterplotOptgroup)
      ;
    $("<option />")
      .text("Pin")
      .attr("value", "pin")
      .appendTo(scatterplotOptgroup)
      ;

    // var imagesOptgroup = $("<optgroup />")
    //   .attr("label", "Images")
    //   .appendTo(this.selection_select)
    //   ;
    // $("<option />")
    //   .text("Open")
    //   .attr("value", "open")
    //   .appendTo(imagesOptgroup)
    //   ;
    // $("<option />")
    //   .text("Close")
    //   .attr("value", "close")
    //   .appendTo(imagesOptgroup)
    //   ;
    

    // Set state
    self._set_selection();
  },

  // _set_selected_cluster: function()
  // {
  //   var self = this;
  //   this.cluster_select.val(self.options.cluster_index);
  // },

  _set_selected_x: function()
  {
    var self = this;
    this.x_select.val(self.options["x-variable"]);
  },

  _set_selected_y: function()
  {
    var self = this;
    this.y_select.val(self.options["y-variable"]);
  },

  _set_selected_image: function()
  {
    var self = this;
    if(self.options["image-variable"] != null && self.options.image_variables.length > 0)
    {
      this.images_select.val(self.options["image-variable"]);
    }
  },

  _set_selected_color: function()
  {
    var self = this;
    this.color_select.val(self.options["color-variable"]);
  },

  _set_selection: function()
  {
    var self = this;
    this.selection_select.prop("disabled", this.options.selection.length == 0);
    this.selection_label.toggleClass("disabled", this.options.selection.length == 0);
  },

  _set_show_all: function()
  {
    var self = this,
        noneHidden = this.options.hidden_simulations.length == 0;
    var titleText = 'Show All Hidden Scatterplot Points';
    if(noneHidden) {
      titleText = 'There are currently no hidden scatterplot points to show.';
    }
    this.show_all_button.prop("disabled", noneHidden);
    this.show_all_button.attr("title", titleText);
  },

  // Remove hidden_simulations from indices
  _filterIndices: function()
  {
    var self = this;
    var indices = self.options.indices;
    var hidden_simulations = self.options.hidden_simulations;
    var filtered_indices = self._cloneArrayBuffer(indices);
    var length = indices.length;

    // Remove hidden simulations and NaNs and empty strings
    for(var i=length-1; i>=0; i--){
      var hidden = $.inArray(indices[i], hidden_simulations) > -1;
      if(hidden) {
        filtered_indices.splice(i, 1);
      }
    }

    return filtered_indices;
  },

  // Clones an ArrayBuffer or Array
  _cloneArrayBuffer: function(source)
  {
    // Array.apply method of turning an ArrayBuffer into a normal array is very fast (around 5ms for 250K) but doesn't work in WebKit with arrays longer than about 125K
    // if(source.length > 1)
    // {
    //   return Array.apply( [], source );
    // }
    // else if(source.length == 1)
    // {
    //   return [source[0]];
    // }
    // return [];

    // For loop method is much shower (around 300ms for 250K) but works in WebKit. Might be able to speed things up by using ArrayBuffer.subarray() method to make smallery arrays and then Array.apply those.
    var clone = [];
    for(var i = 0; i < source.length; i++)
    {
      clone.push(source[i]);
    }
    return clone;
  },

  _setOption: function(key, value)
  {
    var self = this;

    //console.log("sparameter_image.variableswitcher._setOption()", key, value);
    this.options[key] = value;

    // if(key == "cluster_index")
    // {
    //   self._set_selected_cluster();
    // }
    if(key == "x-variable")
    {
      self._set_selected_x();
    }
    else if(key == "y-variable")
    {
      self._set_selected_y();
    }
    else if(key == "image-variable")
    {
      self._set_selected_image();
    }
    else if(key == "color-variable")
    {
      self._set_selected_color();
    }
    else if(key == "image_variables")
    {
      self._set_image_variables();
    }
    else if(key == 'x_variables')
    {
      self._set_x_variables();
    }
    else if(key == 'y_variables')
    {
      self._set_y_variables();
    }
    else if(key == 'color_variables')
    {
      self._set_color_variables();
    }
    else if(key == 'selection')
    {
      self._set_selection();
    }
    else if(key == 'hidden_simulations')
    {
      self._set_show_all();
    }
  },

});
