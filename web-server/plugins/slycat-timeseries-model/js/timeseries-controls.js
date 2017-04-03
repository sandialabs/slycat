/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/
define("slycat-timeseries-controls", ["slycat-server-root", "slycat-dialog"], function(server_root, dialog) {
$.widget("timeseries.controls",
{
  options:
  {
    mid : null,
    model_name : null,
    aid : null,
    metadata : null,
    // cluster_index : null,
    "color-variable" : null,
    clusters : [],
    cluster : null,
    color_variables : [],
    selection : [],
    hidden_simulations : [],
    indices : [],
    highlight: [],
  },

  _create: function()
  {
    var self = this;
    var general_controls = $("#general-controls", this.element);

    this.outputs_control = $('<div class="btn-group btn-group-xs"></div>')
      .appendTo(general_controls)
      ;
    this.outputs_button = $('\
      <button class="btn btn-default dropdown-toggle" type="button" id="outputs-dropdown" data-toggle="dropdown" aria-expanded="true" title="Change Outputs"> \
        Outputs \
        <span class="caret"></span> \
      </button> \
      ')
      .appendTo(self.outputs_control)
      ;
    this.outputs_items = $('<ul id="y-axis-switcher" class="dropdown-menu" role="menu" aria-labelledby="outputs-dropdown">')
      .appendTo(self.outputs_control)
      ;

    this.color_control = $('<div class="btn-group btn-group-xs"></div>')
      .appendTo(general_controls)
      ;
    this.color_button = $('\
      <button class="btn btn-default dropdown-toggle" type="button" id="color-dropdown" data-toggle="dropdown" aria-expanded="true" title="Change Line Color"> \
        Line Color \
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
        if (self.options.highlight.length == 0 && ( self.options.selection == null || self.options.selection.length == self.options.metadata['row-count'] )) {
          self._write_data_table();
        } else {
          openCSVSaveChoiceDialog();
        }
      })
      .appendTo(general_controls)
      ;

    function openCSVSaveChoiceDialog(){
      var txt = "";
      var buttons_save = [
        {className: "btn-default", label:"Cancel"}, 
        {className: "btn-primary", label:"Save Entire Table", icon_class:"fa fa-table"}
      ];
      var filteredHighlight;
      if(self.options.selection != null && self.options.selection.length > 0)
      {
        filteredHighlight = self.options.highlight.filter(function(el){
          return self.options.selection.indexOf(el) != -1;
        });
      }
      else
      {
        filteredHighlight = self.options.highlight;
      }

      if(filteredHighlight.length > 0)
      {
        txt += "You have " + filteredHighlight.length + " rows selected. ";
        buttons_save.splice(buttons_save.length-1, 0, {className: "btn-primary", label:"Save Selected", icon_class:"fa fa-check"});
      }
      if(self.options.selection != null && self.options.selection.length > 0 && self.options.selection.length < self.options.metadata['row-count'])
      {
        var visibleRows = self.options.selection.length;
        txt += "You have " + visibleRows + " rows visible. ";
        buttons_save.splice(buttons_save.length-1, 0, {className: "btn-primary", label:"Save Visible", icon_class:"fa fa-eye"});
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
            self._write_data_table(filteredHighlight);
          else if(button.label == "Save Visible")
            self._write_data_table(self.options.selection);
        },
      });
    }

    // if(self.options.clusters.length > 0)
    // {
    //   self._set_clusters();
    // }
    self._set_color_variables();
    self._set_outputs();
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
    var selectionList = sl || [];
    var numRows = array[0].length;
    var numCols = array.length;
    var rowMajorOutput = "";
    var r, c;
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
          rowMajorOutput += array[c][r] + ",";
        }
        rowMajorOutput = rowMajorOutput.slice(0, -1); //rmv last comma
        rowMajorOutput += "\n";
      }
    }
    return rowMajorOutput;
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

  _set_outputs: function()
  {
    var self = this;
    this.outputs_items.empty();
    for(var i = 0; i < this.options.clusters.length; i++) {
      $("<li role='presentation'>")
        .toggleClass("active", self.options["cluster"] == i)
        .attr("data-cluster", i)
        .appendTo(self.outputs_items)
        .append(
          $('<a role="menuitem" tabindex="-1">')
            .html(this.options.clusters[i])
            .click(function()
            {
              var menu_item = $(this).parent();
              if(menu_item.hasClass("active"))
                return false;

              self.outputs_items.find("li").removeClass("active");
              menu_item.addClass("active");

              self.options.cluster = menu_item.attr("data-cluster");
              self.element.trigger("cluster-changed", menu_item.attr("data-cluster"));
            })
        )
        ;
    }
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
});
