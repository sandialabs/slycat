/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/
define("slycat-cca-controls", ["slycat-server-root"], function(server_root) {
$.widget("cca.controls",
{

	options:
  {
  	mid : null,
  	model_name : null,
  	aid : null,
  	metadata : null,
  	selection : [],
  },

  _create: function()
  {
  	var self = this;

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

    self.save_choice_buttons = {
      'Save The Whole Table': function() {
         self._write_data_table();
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

    function openCSVSaveChoiceDialog(){
      var txt = "";

      if(self.options.selection.length > 0)
      {
        txt += "You have " + self.options.selection.length + " rows selected. ";
      }

      txt += "What would you like to do?";
      $("#csv-save-choice-form #csv-save-choice-label").text(txt);

      var buttons = $.extend({}, self.save_choice_buttons);
      if(self.options.selection.length == 0)
      {
        delete buttons["Save Selected Rows"];
      }

      $("#csv-save-choice-form").dialog("option", "buttons", buttons);

      $("#csv-save-choice-form").dialog("open");
    }

  },

  _write_data_table: function(sl)
  {
    var selectionList = sl || [];
    var self = this;
    var numRows = self.options.metadata['row-count'];
    var numCols = self.options.metadata['column-count'];
    var rowRequest = "";

    if (selectionList.length > 0) {
      selectionList.sort(function(x,y) {return x-y});
      rowRequest = "rows=" + selectionList.toString();
    } else {
      rowRequest = "rows=0-" + numRows;
    }

    $.ajax(
    {
      type : "GET",
      url : server_root + "models/" + self.options.mid + "/tables/" + self.options.aid + "/arrays/0/chunk?" + rowRequest + "&columns=0-" + numCols + "&index=Index",
      success : function(result)
      {
        self._write_csv( self._convert_to_csv(result), self.options.model_name + "_data_table.csv" );
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
  },

  _convert_to_csv: function(array)
  {
    // Note that array.data is column-major:  array.data[0][*] is the first column
    var numRows = array.rows.length;
    var numCols = array.columns.length;
    var rowMajorOutput = "";
    numCols = numCols - 1;  // skip last column which is slycat index
    var r, c;
    // add the headers
    for(c=0; c<numCols; c++) {
      rowMajorOutput += array["column-names"][c] + ",";
    }
    rowMajorOutput = rowMajorOutput.slice(0, -1); //rmv last comma
    rowMajorOutput += "\n";
    // add the data
    for(r=0; r<numRows; r++) {
      for(c=0; c<numCols; c++) {
        rowMajorOutput += array.data[c][r] + ",";
      }
      rowMajorOutput = rowMajorOutput.slice(0, -1); //rmv last comma
      rowMajorOutput += "\n";
    }
    return rowMajorOutput;
  },

  _setOption: function(key, value)
  {
    var self = this;

    //console.log("sparameter_image.variableswitcher._setOption()", key, value);
    this.options[key] = value;

    if(key == 'selection')
    {
      self._set_selection();
    }
  },

});
});