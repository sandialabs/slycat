/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

function timeseries_simulation_table(parameters, server_root, workerId)
{

  this.simulation_callbacks = [];
  this.sort_order_callbacks = [];
  this.waveform_indexes = [];
  var bookmarker = parameters.bookmarker;
  this.cluster_name = parameters.cluster_name;
  this.cluster_index = parameters.cluster_index;

  var data_table_metadata;

  //Grabbing metadata from the table chunker
  $.ajax({
    url : server_root + "workers/" + workerId + "/table-chunker/metadata",
    contentType : "application/json",
    async: false, // Much of the rest of the script relies on this metadata, so dong this synchronously
    success: function(resp){
      data_table_metadata = resp;
    },
    error: function(request, status, reason_phrase){
      window.alert("Error getting metadata from table-chunker worker: " + reason_phrase);
    }
  });


  this.index_column = data_table_metadata["column-count"] - 1;
  var column_max = data_table_metadata["column-max"];
  var column_min = data_table_metadata["column-min"];
  var column_names = data_table_metadata["column-names"];

  var colorMaps = {
    // This is meant to be used against a black background
    "nightcolormap": {
      "scalar": [0.0, 0.03125, 0.0625, 0.09375, 0.125, 0.15625, 0.1875, 0.21875, 0.25, 0.28125, 0.3125, 0.34375, 0.375, 0.40625, 0.4375, 0.46875, 0.5, 0.53125, 0.5625, 0.59375, 0.625, 0.65625, 0.6875, 0.71875, 0.75, 0.78125, 0.8125, 0.84375, 0.875, 0.90625, 0.9375, 0.96875, 1.0,],
      "RGBs"  : [
                  d3.rgb( 59,  76, 192),
                  d3.rgb( 68,  90, 204),
                  d3.rgb( 77, 104, 215),
                  d3.rgb( 87, 117, 225),
                  d3.rgb( 98, 130, 234),
                  d3.rgb(108, 142, 241),
                  d3.rgb(119, 154, 247),
                  d3.rgb(130, 165, 251),
                  d3.rgb(141, 176, 254),
                  d3.rgb(152, 185, 255),
                  d3.rgb(163, 194, 255),
                  d3.rgb(174, 201, 253),
                  d3.rgb(184, 208, 249),
                  d3.rgb(194, 213, 244),
                  d3.rgb(204, 217, 238),
                  d3.rgb(213, 219, 230),
                  d3.rgb(221, 221, 221),
                  d3.rgb(229, 216, 209),
                  d3.rgb(236, 211, 197),
                  d3.rgb(241, 204, 185),
                  d3.rgb(245, 196, 173),
                  d3.rgb(247, 187, 160),
                  d3.rgb(247, 177, 148),
                  d3.rgb(247, 166, 135),
                  d3.rgb(244, 154, 123),
                  d3.rgb(241, 141, 111),
                  d3.rgb(236, 127,  99),
                  d3.rgb(229, 112,  88),
                  d3.rgb(222,  96,  77),
                  d3.rgb(213,  80,  66),
                  d3.rgb(203,  62,  56),
                  d3.rgb(192,  40,  47),
                  d3.rgb(180,   4,  38),
                ],
      "className": "nightMode",
    },
    // This is used against a white background
    "daycolormap": {
      "scalar": [0,0.03125,0.0625,0.09375,0.125,0.15625,0.1875,0.21875,0.25,0.28125,0.3125,0.34375,0.375,0.40625,0.4375,0.46875,0.5,0.53125,0.5625,0.59375,0.625,0.65625,0.6875,0.71875,0.75,0.78125,0.8125,0.84375,0.875,0.90625,0.9375,0.96875,1,],
      "RGBs"  : [
                  d3.rgb(100, 108, 234),
                  d3.rgb(115, 118, 240),
                  d3.rgb(128, 128, 244),
                  d3.rgb(140, 138, 248),
                  d3.rgb(151, 147, 250),
                  d3.rgb(161, 155, 251),
                  d3.rgb(169, 163, 251),
                  d3.rgb(177, 170, 250),
                  d3.rgb(184, 177, 248),
                  d3.rgb(189, 182, 245),
                  d3.rgb(193, 187, 241),
                  d3.rgb(197, 191, 236),
                  d3.rgb(199, 194, 230),
                  d3.rgb(200, 196, 224),
                  d3.rgb(201, 198, 216),
                  d3.rgb(200, 199, 208),
                  d3.rgb(198, 198, 198),
                  d3.rgb(210, 197, 195),
                  d3.rgb(220, 194, 192),
                  d3.rgb(229, 191, 187),
                  d3.rgb(236, 186, 181),
                  d3.rgb(243, 181, 175),
                  d3.rgb(248, 175, 168),
                  d3.rgb(251, 168, 160),
                  d3.rgb(254, 159, 152),
                  d3.rgb(255, 150, 143),
                  d3.rgb(255, 140, 133),
                  d3.rgb(253, 129, 123),
                  d3.rgb(250, 117, 112),
                  d3.rgb(246, 105, 101),
                  d3.rgb(240,  91,  90),
                  d3.rgb(233,  75,  78),
                  d3.rgb(225,  57,  66),
                ],
      "className": "dayMode",
    },
  }

  // These are unused for now. They are just slightly lighter than the ones that we use agains a black background
  // var KenColorMapScalar2 = [0,0.03125,0.0625,0.09375,0.125,0.15625,0.1875,0.21875,0.25,0.28125,0.3125,0.34375,0.375,0.40625,0.4375,0.46875,0.5,0.53125,0.5625,0.59375,0.625,0.65625,0.6875,0.71875,0.75,0.78125,0.8125,0.84375,0.875,0.90625,0.9375,0.96875,1,];
  // var KenColorMapRGBs2   = [
  //                           d3.rgb( 55,  69, 171),
  //                           d3.rgb( 63,  81, 182),
  //                           d3.rgb( 70,  93, 192),
  //                           d3.rgb( 79, 105, 201),
  //                           d3.rgb( 87, 117, 209),
  //                           d3.rgb( 96, 128, 215),
  //                           d3.rgb(106, 138, 220),
  //                           d3.rgb(115, 148, 224),
  //                           d3.rgb(125, 158, 227),
  //                           d3.rgb(135, 166, 228),
  //                           d3.rgb(145, 174, 228),
  //                           d3.rgb(155, 181, 226),
  //                           d3.rgb(164, 186, 223),
  //                           d3.rgb(174, 191, 219),
  //                           d3.rgb(182, 195, 213),
  //                           d3.rgb(191, 197, 206),
  //                           d3.rgb(198, 198, 198),
  //                           d3.rgb(205, 195, 188),
  //                           d3.rgb(211, 190, 177),
  //                           d3.rgb(215, 184, 166),
  //                           d3.rgb(219, 176, 155),
  //                           d3.rgb(220, 168, 143),
  //                           d3.rgb(221, 159, 132),
  //                           d3.rgb(220, 149, 121),
  //                           d3.rgb(218, 138, 110),
  //                           d3.rgb(215, 127,  99),
  //                           d3.rgb(210, 114,  88),
  //                           d3.rgb(204, 101,  78),
  //                           d3.rgb(198,  87,  69),
  //                           d3.rgb(190,  73,  59),
  //                           d3.rgb(181,  57,  51),
  //                           d3.rgb(171,  39,  43),
  //                           d3.rgb(161,  13,  35),
  //                          ];

  // Setup SlickGrid columns
  var columns = [];
    // Add the initial column for the simulation id.
  columns.push({
    name: column_names[this.index_column], // The human friendly, visible column label
    field: column_names[this.index_column], // The field name used in the data row objects
    id: column_names[this.index_column], // An unique identifier for each column in the model, allowing to set more than one column reading the same field. In most cases field and id will have the same value.
    toolTip: column_names[this.index_column],
    sortable: false,
    selectable: true,
    headerCssClass: "headerSimId",
    cssClass: "rowSimId",
    columnMin: column_min[this.index_column],
    columnMax: column_max[this.index_column],
  });

  // Now add the input variables.
  for(var j = 0; j != data_table_metadata["column-count"]-1; ++j)
  {
    columns.push({
      name: column_names[j],
      field: column_names[j],
      /* disabling prepending column names with incrementing index since this is causing problems with new workers
      id: (j+1) + '_' + parameters.inputs[j],
      */
      id: column_names[j],
      toolTip: column_names[j],
      sortable: false,
      selectable: true,
      headerCssClass: "headerInput",
      cssClass: "rowInput",
      columnMin: column_min[j],
      columnMax: column_max[j],
    });
  }

  setUpColorMapsForAllColumns("nightcolormap");

  function setUpColorMapsForAllColumns(colorMapName) {
    for(var j = 0; j != columns.length; ++j) {
      columns[j].colorMap = createColorMap( columns[j].columnMin, columns[j].columnMax, colorMaps[colorMapName].scalar, colorMaps[colorMapName].RGBs );
    }
  }

  function createColorMap(min, max, scalar, rgb) {
    var range = max - min;
    var domain = [];
    for(i=0; i < scalar.length; i++) {
      domain.push( (range * scalar[i]) + min );
    }
    var colorMap = d3.scale.linear().domain( domain ).range( rgb );
    return colorMap;
  }

  // Initialize SlickGrid
  var grid;
  var loadingIndicator = null;

  function initializeSlickGrid(){
    var options = {
      enableCellNavigation: true,
      enableColumnReorder: false,
      autoHeight: false // true just makes the grid full height with no scroll bars
    };

    d3.select(parameters.container).append("div")
      .attr("id", "timeseries-table-slickgrid")
      ;
    grid = new Slick.Grid("#timeseries-table-slickgrid", loader.data, columns, options);

    grid.registerPlugin(new Slick.AutoTooltips());
    grid.setSelectionModel(new Slick.RowSelectionModel());

    grid.onViewportChanged.subscribe(function (e, args) {
      var vp = grid.getViewport();
      // For now just loading all columns. In future limit the last 2 parameters to just be the columns that are visible in the viewport.
      loader.ensureData(vp.top, vp.bottom, 0, columns.length);
    });

    grid.onHeaderClick.subscribe(function (e, args) {
      self.highlight_variable( grid.getColumnIndex(args.column.id) );
    });

    grid.onSort.subscribe(function (e, args) {
      var selectedRows = grid.getSelectedRows();
      var selectedRowData;
      if(selectedRows.length > 0) {
        selectedRowData = grid.getData()[selectedRows[0]];
      }

      loader.setSort(args.sortCol.field, args.sortAsc ? 1 : -1);
      var vp = grid.getViewport();
      // For now just loading all columns. In future limit the 3rd and 4th parameters to just be the columns that are visible in the viewport.
      loader.ensureData(vp.top, vp.bottom, 0, columns.length, function(){
        if(selectedRowData){
          self.select_simulations([selectedRowData.Index], false);
        } 
      });

      for(var j = 0; j != self.sort_order_callbacks.length; ++j)
        self.sort_order_callbacks[j]( args.sortCol.field, args.sortAsc ? 1 : -1 );
    });

    grid.onSelectedRowsChanged.subscribe(function (e, args) {
      var selected_rows = grid.getSelectedRows();
      // This gets fired even when a row is unselected, so we first check that we have a selected row
      if( grid && (selected_rows.length > 0) ) {
        var indices = [];
        var min_of_selected_rows = Math.min.apply(Math, selected_rows);
        var max_of_selected_rows = Math.max.apply(Math, selected_rows);
        loader.ensureData(min_of_selected_rows, max_of_selected_rows+1, 0, columns.length, fireOffSimulationCallbacks);
      }
      // If last row has been unselected, we need to fire off the callbacks to make chart unselect last plot
      else if(selected_rows.length == 0) {
        fireOffSimulationCallbacks();
      }
    });

    function fireOffSimulationCallbacks(){
      var selected_rows = grid.getSelectedRows();
      var indices = [];
      var waveform_indexes = [];
      for(var i=0; i<selected_rows.length; i++){
        indices.push( grid.getDataItem(selected_rows[i]).Simulation );
        waveform_indexes.push( self.waveform_indexes[grid.getDataItem(selected_rows[i]).index] );
      }
      for(var j = 0; j != self.simulation_callbacks.length; ++j)
        self.simulation_callbacks[j](indices);
      parameters.waveform_viewer.select(waveform_indexes);

      // Records the row selection in the server log
      if(selected_rows.length > 0) {
        $.ajax(
        {
          type : "POST",
          url : server_root + "events/models/" + parameters.model_id + "/select/simulation/" + grid.getDataItem(selected_rows[0]).index,
        });
      }

      // Bookmarks the row selection
      var selected_row_simulation = {};
      selected_row_simulation[self.cluster_index + "-selected-row-simulations"] = indices;
      bookmarker.updateState( selected_row_simulation );
    }

    loader.onDataLoading.subscribe(function () {
      if (!loadingIndicator) {
        loadingIndicator = $("<span class='loading-indicator'><label>Buffering...</label></span>").appendTo(document.body);
        var $g = $("#timeseries-table-slickgrid");

        loadingIndicator
            .css("position", "absolute")
            .css("top", $g.position().top + $g.height() / 2 - loadingIndicator.height() / 2)
            .css("left", $g.position().left + $g.width() / 2 - loadingIndicator.width() / 2);
      }

      loadingIndicator.show();
    });

    loader.onDataLoaded.subscribe(function (e, row_indexes) {
      for (var i = 0; i <= row_indexes.length; i++) {
        grid.invalidateRow( row_indexes[i] );
      }

      grid.updateRowCount();
      grid.render();

      loadingIndicator.fadeOut();
    });

    // load the first page
    var vp = grid.getViewport();
    // Determine which column to select based on what's in the bookmark
    var selectedColumn = parameters.selected_column_index ? parameters.selected_column_index : 0;
    // For now just loading all columns. In future limit the last 2 parameters to just be the columns that are visible in the viewport.
    // The last parameter is a callback that selects the first column.
    loader.ensureData(vp.top, vp.bottom, 0, columns.length, function(){
      // Select a row based on what's in the bookmark
      if(parameters.selected_row_simulations != undefined){
        var row_indexes = [];
        var row_index;
        for(var i=0; i<parameters.selected_row_simulations.length; i++) {
          row_index = loader.getTableFilter().indexOf( parameters.selected_row_simulations[i] );
          if(row_index > -1)
            row_indexes.push( row_index );
        }
        if(row_indexes.length > 0) {
          grid.scrollRowIntoView(row_indexes[0]);
          grid.setSelectedRows(row_indexes);
        }
      }
      // Select a column
      self.highlight_variable(selectedColumn, true);
    });
  }

  this.select_simulations = function(indices, asyncFlag) {
    var index = indices[0];

    var queryParams = { 
        "query" : self.index_column + ":" + index, 
      };
    $.ajax({
      contentType : "application/json",
      url : server_root + "workers/" + workerId + "/table-chunker/search",
      type : "GET",
      cache : false,
      data: queryParams,
      processData : true,
      dataType: 'json',
      async: asyncFlag,
      success: function(resp){
        var match = resp.matches[0][0];
        grid.scrollRowIntoView(match);
        grid.setSelectedRows([match]);
      }
    });
  }

  this.set_sort_order = function(sort_field, sort_direction) {
    loader.setSort(sort_field, sort_direction);
    var vp = grid.getViewport();
    // For now just loading all columns. In future limit the 3rd and 4th parameters to just be the columns that are visible in the viewport.
    loader.ensureData(vp.top, vp.bottom, 0, columns.length);
  }

  this.highlight_variable = function(column_index, skip_bookmarking)
  {
    // Records the column selection in the server log
    $.ajax(
    {
      type : "POST",
      url : server_root + "events/models/" + parameters.model_id + "/select/variable/" + column_index,
    });

    // Bookmarks the column selection
    if(!skip_bookmarking){
      var selected_column_index = {};
      selected_column_index[this.cluster_index + "-column-index"] = column_index;
      bookmarker.updateState(selected_column_index);
    }

    // Clear color and background styles on all table cells
    for(var i = 0; i < columns.length; i++) {
      columns[i].formatter = undefined;
      columns[i].cssClass = columns[i].cssClass.replace(' highlight','');
      columns[i].headerCssClass = columns[i].headerCssClass.replace(' selected','');
    }

    columns[column_index].formatter = Slick.Formatters.RangeFormatter;
    columns[column_index].cssClass = columns[column_index].cssClass + " highlight";
    columns[column_index].headerCssClass = columns[column_index].headerCssClass + " selected";

    if( grid ) {
      grid.setColumns(columns);
      // Calling .setData() forces the grid to re-render everything, including currently visible rows. Other methods are more efficient but don't update the currently visible rows.
      grid.setData(loader.data);
      grid.render();
    }

    setWaveformColors(column_index);
  }

  this.updateColorMap = function(colorMapName) {
    // Swap in the new color map
    setUpColorMapsForAllColumns(colorMapName);
    // Update grid with new color map and make it show the new colors
    if( grid ) {
      grid.setColumns(columns);
      // Calling .setData() forces the grid to re-render everything, including currently visible rows. Other methods are more efficient but don't update the currently visible rows.
      grid.setData(loader.data);
      grid.render();
    }
    // Set up the background class for the waveform viewer
    parameters.waveform_viewer.container.attr("class", colorMaps[colorMapName].className);
    // Change the colors of waveforms in the viewer and dendrogram
    self.setWaveformColorsPerSelectedColumn();
  }

  this.setWaveformColorsPerSelectedColumn = function(dendrogramOnly) {
    // get the currently selected column
    var currentlySelectedColumn = -1;
    for(var i = 0, len = columns.length; i < len; i++) {
      if (columns[i].headerCssClass.indexOf(" selected") > -1) {
          currentlySelectedColumn = i;
          break;
      }
    }
    // if we have a currently selected column, call setWaveformColors with its index
    if(currentlySelectedColumn > -1) {
      setWaveformColors(currentlySelectedColumn, dendrogramOnly);
    }
  }

  function setWaveformColors(column_index, dendrogramOnly) {
    var colorMap = columns[column_index].colorMap; // 1ms
    var columnsToRetrieve = [column_names.indexOf(columns[column_index].name), self.index_column]; // 1ms
    
    //Grabbing all filtered values for current column and index column, not just the ones visible in slickGrid's viewport
    var queryParams = { 
      "rows" : loader.getTableFilter().join(','), 
      "columns" : columnsToRetrieve.join(','),
    } // 1ms

    console.time("setWaveformColors");
    $.ajax({
      url : server_root + "workers/" + workerId + "/table-chunker/chunk",
      contentType : "application/json",
      data: queryParams,
      processData : true,
      async: true,
      success: function(resp){
        console.timeEnd("setWaveformColors");
        var color_array = resp["data"][0];
        var data_table_index_array = resp["data"][1];
        if(!dendrogramOnly)
          parameters.waveform_viewer.set_color(color_array, colorMap, data_table_index_array);
        parameters.dendrogram_viewer.set_color(color_array, colorMap, data_table_index_array);
      },
      error: function(request, status, reason_phrase){
        window.alert("Error getting color coding values from table-chunker worker: " + reason_phrase);
      }
    });
  }

  // Start a loader for accessing table data with slickgrid ...
  var loader = new Slick.Data.TimeseriesLoader(
      server_root + "workers/", 
      workerId, 
      data_table_metadata["row-count"], 
      column_names, 
      data_table_metadata["column-count"]
    );

  this.update = function(parameters)
  {
    if(parameters.cluster_name != undefined)
      this.cluster_name = parameters.cluster_name;
    if(parameters.cluster_index != undefined)
      this.cluster_index = parameters.cluster_index;

    if(parameters.highlight != undefined)
      this.highlight_variable(parameters.highlight);

    if(parameters.add_simulation_callback)
      this.simulation_callbacks.push(parameters.add_simulation_callback);

    if(parameters.add_sort_order_callback)
      this.sort_order_callbacks.push(parameters.add_sort_order_callback);

    if(parameters.simulation_selection != undefined)
      this.select_simulations(parameters.simulation_selection, false);

    if( (parameters.sort_field != undefined) && (parameters.sort_direction != undefined) ) {
      // Sets the sort order of the column.
      this.set_sort_order(parameters.sort_field, parameters.sort_direction);
      // Sets the sort order glyph on the column.
      var isAscending = parameters.sort_direction == 1 ? true : false; 
      grid.setSortColumn(parameters.sort_field, isAscending);
    }

    if(parameters.table_filter) {
      loader.clear();
      loader.setTableFilter(parameters.table_filter);
      if(grid) {
        // Unselecting all selected rows, since we are about to load new data
        grid.getSelectionModel().setSelectedRanges([]);
        //grid.resetActiveCell();
        // Need to invalidate the grid before ensureData because sometimes ensureData does nothing because everything is in the viewport
        grid.invalidate();
        var vp = grid.getViewport();
        // For now just loading all columns. In future limit the 3rd and 4th parameters to just be the columns that are visible in the viewport.
        loader.ensureData(vp.top, vp.bottom, 0, columns.length, function(){
          // When the table filter changes, we need to color the waveforms according to the currently selected column
          if(parameters.selected_column_index != undefined)
            self.highlight_variable(parameters.selected_column_index, true);
          else
            self.setWaveformColorsPerSelectedColumn();
          // Select a row based on what's in the bookmark
          if(parameters.selected_row_simulations != undefined){
            var row_indexes = [];
            var row_index;
            for(var i=0; i<parameters.selected_row_simulations.length; i++) {
              row_index = loader.getTableFilter().indexOf( parameters.selected_row_simulations[i] );
              if(row_index > -1)
                row_indexes.push( row_index );
            }
            if(row_indexes.length > 0) {
              grid.scrollRowIntoView(row_indexes[0]);
              grid.setSelectedRows(row_indexes);
            }
          }
        });
        
      }
    }

    if(parameters.waveform_indexes != undefined) {
      this.waveform_indexes = parameters.waveform_indexes;
    }

  }

  this.update(parameters);

  this.resizeGridCanvas = function()
  {
    grid.resizeCanvas();
  }

  var self = this;
  initializeSlickGrid();
}

(function ($) {
  // register namespace
  $.extend(true, window, {
    "Slick": {
      "Formatters": {
        "RangeFormatter": RangeFormatter
      }
    }
  });

  function RangeFormatter(row, cell, value, columnDef, dataContext) {
    if (value == null || value === "") {
      return "-";
    } else {
      var colorValue = columnDef.colorMap(value);
      var formatted = "<div class='highlightWrapper' style='background-color:" + colorValue + "; color: #383838;'>" + value + "</div>";
      return formatted;
    }
  }

})(jQuery);
