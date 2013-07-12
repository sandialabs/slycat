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
    colorMap: d3.scale.linear().domain([ column_min[this.index_column], column_max[this.index_column] ]).range(["blue", "red"]),
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
      colorMap: d3.scale.linear().domain([ column_min[j], column_max[j] ]).range(["blue", "red"]),
    });
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
    var colorMap = columns[column_index].colorMap;
    var columnsToRetrieve = [column_names.indexOf(columns[column_index].name), self.index_column];
    
    //Grabbing all filtered values for current column and index column, not just the ones visible in slickGrid's viewport
    var queryParams = { 
      "rows" : loader.getTableFilter().join(','), 
      "columns" : columnsToRetrieve.join(','),
    }
    $.ajax({
      url : server_root + "workers/" + workerId + "/table-chunker/chunk",
      contentType : "application/json",
      data: queryParams,
      processData : true,
      async: true,
      success: function(resp){
        var color_array = resp["data"][0];
        var data_table_index_array = resp["data"][1];
        if(!dendrogramOnly)
          parameters.waveform_viewer.set_color(color_array, colorMap);
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
      var formatted = "<div class='highlightWrapper' style='background-color:" + colorValue + "; color: white;'>" + value + "</div>";
      return formatted;
    }
  }

})(jQuery);
