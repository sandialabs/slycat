/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

$.widget("parameter_image.controls",
{
  options:
  {
    "server-root" : "",
    mid : null,
    model_name : null,
    aid : null,
    metadata : null,
    "x-variable" : null,
    "y-variable" : null,
    "image-variable" : null,
    "color-variable" : null,
    x_variables : [],
    y_variables : [],
    image_variables : [],
    color_variables : [],
    rating_variables : [],
    category_variables : [],
    selection : [],
  },

  _create: function()
  {
    var self = this;

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

    this.images_label = $("<label for='images-switcher'>Image Set:</label>")
      .appendTo(this.element)
      ;
    this.images_select = $("<select id='images-switcher' name='images-switcher' />")
      .change(function(){
        self.element.trigger("images-selection-changed", this.value);
      })
      .appendTo(this.element)
      ;

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
        this.selectedIndex = 0;
      })
      .appendTo(this.element)
      ;

    this.csv_button = $("<button>Download Data Table</button>")
	.click(function(){
          if (self.options.selection.length == 0) {
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
          if( valueValid && numeric && Number.isNaN(Number(value)) ) {
            valueValid = false;
          }
          if(valueValid) {
            self.element.trigger("set-value", {selection : self.options.selection, variable : variableIndex, value : value});
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


    $('#csv-save-choice-form').dialog({
      modal: true,
      autoOpen: false,
      buttons: {
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
      },
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
      var txt = "You have " + self.options.selection.length + " rows selected. What would you like to do?";
      $("#csv-save-choice-form #csv-save-choice-label").text(txt);
      $("#csv-save-choice-form").dialog("open");
    }

    self._set_x_variables();
    self._set_y_variables();
    self._set_image_variables();
    self._set_color_variables();
    self._set_selection_control();
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
      //console.log("++ writing partial table rowRequest: " + rowRequest);
    } else {
      rowRequest = "rows=0-" + numRows;
    }

    $.ajax(
    {
      type : "GET",
      url : self.options['server-root'] + "models/" + self.options.mid + "/tables/" + self.options.aid + "/arrays/0/chunk?" + rowRequest + "&columns=0-" + numCols + "&index=Index",
      //url : self.options['server-root'] + "models/" + self.options.mid + "/tables/" + self.options.aid + "/arrays/0/chunk?rows=0-" + numRows + "&columns=0-" + numCols + "&index=Index",
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
    //var D = self.window.document;
    var D = document;   // is this the best way to do this?
    //var A = arguments;
    //var a = self.createElement("a");
    var a = D.createElement("a");
    var strMimeType = "text/plain";
    var defaultFilename = defaultFilename || "slycatDataTable.csv";

    //build download link:
    a.href = "data:" + strMimeType + "charset=utf-8," + encodeURIComponent(csvData);  //encodeURIComponent() handles all special chars

    if ('download' in a) { //FF20, CH19
      //console.log( "++ FF20 CH19 processing..." );
      //console.log( a );
      a.setAttribute("download", defaultFilename);
      //a.setAttribute("download", n);
      a.innerHTML = "downloading...";
      //this.element.appendChild(a);
      D.body.appendChild(a);
      setTimeout(function() {
	//var e = this.createEvent("MouseEvents");
        var e = D.createEvent("MouseEvents");
	e.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
	a.dispatchEvent(e);
	//this.element.removeChild(a);
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
      $("<option />")
        .text("Clear")
        .attr("value", this.options.rating_variables[i])
        .attr("label", "clear")
        .appendTo(optgroup)
        ;
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
    this.selection_select.prop("disabled", this.options.selection.length == 0);
    this.selection_label.toggleClass("disabled", this.options.selection.length == 0);
  },

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
    this.images_select.val(self.options["image-variable"]);
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

  _setOption: function(key, value)
  {
    var self = this;

    //console.log("sparameter_image.variableswitcher._setOption()", key, value);
    this.options[key] = value;

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
  },

});
