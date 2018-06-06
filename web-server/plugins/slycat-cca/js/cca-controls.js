/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

import server_root from "js/slycat-server-root";
import _ from "lodash";
import * as dialog from "js/slycat-dialog-webpack";
import Papa from "papaparse";
import "jquery-ui";

$.widget("cca.controls",
{

	options:
  {
  	mid : null,
  	model_name : null,
  	aid : null,
  	metadata : null,
    "color-variable" : null,
    color_variables : [],
  	selection : [],
  },

  _create: function()
  {
  	var self = this;

    this.color_control = $('<div class="btn-group btn-group-xs"></div>')
      .appendTo(this.element)
      ;
    this.color_button = $('\
      <button class="btn btn-default dropdown-toggle" type="button" id="color-dropdown" data-toggle="dropdown" aria-expanded="true" title="Change Point Color"> \
        Point Color \
        <span class="caret"></span> \
      </button> \
      ')
      .appendTo(self.color_control)
      ;
    this.color_items = $('<ul id="y-axis-switcher" class="dropdown-menu" role="menu" aria-labelledby="color-dropdown">')
      .appendTo(self.color_control)
      ;

  	this.csv_button = $("\
      <button class='btn btn-default' title='Download Data Table'> \
        <span class='fa fa-download' aria-hidden='true'></span> \
      </button> \
      ")
    	.click(function(){
        if (self.options.selection.length == 0) {
    	    self._write_data_table();
    	  } else {
          openCSVSaveChoiceDialog();
        }
    	})
    	.appendTo(this.element)
    	;

    function openCSVSaveChoiceDialog(){
      var txt = "";
      var buttons_save = [
        {className: "btn-default", label:"Cancel"}, 
        {className: "btn-primary", label:"Save Entire Table", icon_class:"fa fa-table"}
      ];

      if(self.options.selection.length > 0)
      {
        txt += "You have " + self.options.selection.length + " rows selected. ";
        buttons_save.splice(buttons_save.length-1, 0, {className: "btn-primary",  label:"Save Selected", icon_class:"fa fa-check"});
      }

      txt += "What would you like to do?";

      dialog.dialog(
      {
        title: "Download Choices",
        message: txt,
        buttons: buttons_save,
        callback: function(button)
        {
          if(button.label == "Save Entire Table")
            self._write_data_table();
          else if(button.label == "Save Selected")
            self._write_data_table( self.options.selection );
        },
      });
    }
    self._set_color_variables();
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
    var blob = new Blob([ csvData ], {
      type : "application/csv;charset=utf-8;"
    });
    var csvUrl = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = csvUrl;
    link.style = "visibility:hidden";
    link.download = defaultFilename || "slycatDataTable.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  _convert_to_csv: function(array, sl)
  {
    // Note that array.data is column-major:  array.data[0][*] is the first column
    var self = this;
    
    // Converting data array from column major to row major
    var rowMajorData = _.zip(...array);

    // If we have a selection list, remove everything but those elements from the data array
    if(sl != undefined && sl.length > 0)
    {
      // sl is in the order the user selected the rows, so sort it.
      // We want to end up with rows in the same order as in the original data.
      sl.sort();
      // Only keep elements at the indexes specified in sl
      rowMajorData = _.at(rowMajorData, sl);
    }

    // Creating an array of column headers by removing the last one, which is the Index that does not exist in the data
    var headers = self.options.metadata["column-names"].slice(0, -1);
    // Adding headers as first element in array of data rows
    rowMajorData.unshift(headers);

    // Creating CSV from data array
    var csv = Papa.unparse(rowMajorData);
    return csv;
  },

  _set_color_variables: function()
  {
    var self = this;
    this.color_items.empty();
    for(var i = 0; i < this.options.color_variables.length; i++) {
      $("<li role='presentation'>")
        .toggleClass("active", self.options["color-variable"] == self.options.color_variables[i])
        .attr("data-colorvariable", this.options.color_variables[i])
        .appendTo(self.color_items)
        .append(
          $('<a role="menuitem" tabindex="-1">')
            .html(this.options.metadata['column-names'][this.options.color_variables[i]])
            .click(function()
            {
              var menu_item = $(this).parent();
              if(menu_item.hasClass("active"))
                return false;

              self.color_items.find("li").removeClass("active");
              menu_item.addClass("active");

              self.element.trigger("color-selection-changed", menu_item.attr("data-colorvariable"));
            })
        )
        ;
    }
  },

  _set_selected_color: function()
  {
    var self = this;
    self.color_items.find("li").removeClass("active");
    self.color_items.find('li[data-colorvariable="' + self.options["color-variable"] + '"]').addClass("active");
  },

  _setOption: function(key, value)
  {
    var self = this;

    //console.log("sparameter_image.variableswitcher._setOption()", key, value);
    this.options[key] = value;

    if(key == "color-variable")
    {
      self._set_selected_color();
    }
    else if(key == 'color_variables')
    {
      self._set_color_variables();
    }
  },

});