/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

function cca_table(parameters, server_root, workerId)
{
  this.container = $(parameters.container);
  this.index_column = parameters.index_column;
  this.initial_selection = parameters.selection;

  var colorMapper = parameters.colorMapper;

  // Setup SlickGrid columns
  var columns = [];
    // Add the initial column for the simulation id. This is not in the data.
  columns.push({
    name: parameters.index, // The human friendly, visible column label
    field: parameters.index, // The field name used in the data row objects
    id: parameters.index, // An unique identifier for each column in the model, allowing to set more than one column reading the same field. In most cases field and id will have the same value.
    toolTip: parameters.index,
    sortable: false,
    headerCssClass: "headerSimId",
    cssClass: "rowSimId",
    columnMin: parameters.min[parameters.index_column],
    columnMax: parameters.max[parameters.index_column],
  });

  // Now add the input variables.
  for(var j = 0; j != parameters.inputs.length; ++j)
  {
    columns.push({
      name: parameters.inputs[j],
      field: parameters.inputs[j],
      /* disabling prepending column names with incrementing index since this is causing problems with new workers
      id: (j+1) + '_' + parameters.inputs[j],
      */
      id: parameters.inputs[j],
      toolTip: parameters.inputs[j],
      sortable: false,
      headerCssClass: "headerInput",
      cssClass: "rowInput",
      columnMin: parameters.min[ parameters.input_columns[j] ],
      columnMax: parameters.max[ parameters.input_columns[j] ],
    });
  }

  // Now add the output variables.
  for(var j = 0; j != parameters.outputs.length; ++j)
  {
    columns.push({
      name: parameters.outputs[j],
      field: parameters.outputs[j],
      /* disabling prepending column names with incrementing index since this is causing problems with new workers
      id: (j+1) + '_' + parameters.outputs[j],
      */
      id: parameters.outputs[j],
      toolTip: parameters.outputs[j],
      sortable: false,
      headerCssClass: "headerOutput",
      cssClass: "rowOutput",
      columnMin: parameters.min[ parameters.output_columns[j] ],
      columnMax: parameters.max[ parameters.output_columns[j] ],
    });
  }

  // Now add the other variables.
  for(var j = 0; j != parameters.others.length; ++j)
  {
    columns.push({
      name: parameters.others[j],
      field: parameters.others[j],
      /* disabling prepending column names with incrementing index since this is causing problems with new workers
      id: (j+1) + '_' + parameters.outputs[j],
      */
      id: parameters.others[j],
      toolTip: parameters.others[j],
      sortable: false,
      headerCssClass: "headerOther",
      cssClass: "rowOther",
      columnMin: parameters.min[ parameters.other_columns[j] ],
      columnMax: parameters.max[ parameters.other_columns[j] ],
    });
  }

  // Set the default color map based on parameters during init, or use night if not initialized
  var default_color_map = "night";
  if (parameters.colormap != null) {
    default_color_map = parameters.colormap;
  }

  colorMapper.colorswitcher("setUpColorMapsForAllColumns", default_color_map, columns);

  // Add sort button to each column
  for(var j = 0; j < columns.length; ++j)
  {
    columns[j].header = {
      buttons: [
        {
          cssClass: "icon-sort-off",
          tooltip: "Sort ascending",
          command: "sort-ascending"
        }
      ]
    };
  }

  function resetSortButtons(){
    for(var j = 0; j < columns.length; ++j)
    {
      columns[j].header.buttons[0].cssClass = "icon-sort-off";
      columns[j].header.buttons[0].tooltip = "Sort ascending";
      columns[j].header.buttons[0].command = "sort-ascending";
      grid.updateColumnHeader(columns[j].id);
    }
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

    grid = new Slick.Grid(parameters.container, loader.data, columns, options);

    // Enabling header buttons plugin
    var headerButtonsPlugin = new Slick.Plugins.HeaderButtons();
    headerButtonsPlugin.onCommand.subscribe(function(e, args) {
      var column = args.column;
      var button = args.button;
      var command = args.command;
      var grid = args.grid;

      resetSortButtons();

      if (command == "sort-ascending"){
        button.cssClass = 'icon-sort-ascending';
        button.command = 'sort-descending';
        button.tooltip = 'Sort descending'
        doSort(column.field, true);
      } 
      else if (command == "sort-descending") {
        button.cssClass = 'icon-sort-descending';
        button.command = 'sort-ascending';
        button.tooltip = 'Sort ascending';
        doSort(column.field, false);
      }

    });
    grid.registerPlugin(headerButtonsPlugin);
    grid.registerPlugin(new Slick.AutoTooltips());

    grid.setSelectionModel(new Slick.RowSelectionModel());

    grid.onViewportChanged.subscribe(function (e, args) {
      var vp = grid.getViewport();
      // For now just loading all columns. In future limit the last 2 parameters to just be the columns that are visible in the viewport.
      loader.ensureData(vp.top, vp.bottom, 0, columns.length);
    });

    // No longer using built-in sort event handler. Instead built our own sort buttons
    // grid.onSort.subscribe(function (e, args) {
    //   doSort(args.sortCol.field, args.sortAsc);
    // });

    grid.onHeaderClick.subscribe(function (e, args) {
      // Do nothing if click was on non-input or non-output variable
      if( $.inArray(args.column.field, parameters.others) > -1 )
        return;

      highlightVariableAbsoluteIndex($.inArray(args.column.field, parameters.variable_names));

      var input = $.inArray(args.column.field, parameters.inputs);
      var output = $.inArray(args.column.field, parameters.outputs);

      var type, index;
      if(args.column.field == parameters.index) {
        type = 'simulation';
        index = 0;
      } else {
        type = input > -1 ? 'input' : 'output';
        index = input > -1 ? input : output;
      }

      self.container.trigger("variable-changed", [type, index]);
    });

    grid.onSelectedRowsChanged.subscribe(function (e, args) {
      var selected_rows = grid.getSelectedRows();
      if( grid && (selected_rows.length > 0) ) {
        var indices = [];
        var min_of_selected_rows = Math.min.apply(Math, selected_rows);
        var max_of_selected_rows = Math.max.apply(Math, selected_rows);
        loader.ensureData(min_of_selected_rows, max_of_selected_rows+1, 0, columns.length, fireOffSimulationCallbacks);
      }
      else if(selected_rows.length == 0) {
        fireOffSimulationCallbacks();
      }
    });

    function fireOffSimulationCallbacks()
    {
      var selected_rows = grid.getSelectedRows();
      if( grid )
      {
        var indices = [];
        for(var i=0; i<selected_rows.length; i++)
        {
          indices.push( grid.getDataItem(selected_rows[i]).Index );
        }

        self.container.trigger("row-selection-changed", [indices]);
      }
    }

    loader.onDataLoading.subscribe(function () {
      if (!loadingIndicator) {
        loadingIndicator = $("<span class='loading-indicator'><label>Buffering...</label></span>").appendTo(document.body);
        var $g = self.container;

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
    // For now just loading all columns. In future limit the last 2 parameters to just be the columns that are visible in the viewport.
    loader.ensureData(vp.top, vp.bottom, 0, columns.length, function()
    {
      //self.select_simulations(self.initial_selection, false);
    });
  }

  this.select_simulations = function(indices, asyncFlag) {
    // If we have indices, select the appropriate rows
    if(indices.length > 0){
      var queryPrep = [];
      for(var i = 0; i < indices.length; i++) {
        queryPrep.push(self.index_column + ":" + indices[i]);
      }

      var queryParams = { 
          "query" : queryPrep.join(","), 
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
          var matches = [];
          for(var i=0; i<resp.matches.length; i++){
            if(resp.matches[i][0] != null){
              matches.push(resp.matches[i][0]);
            }
          }
          if(matches.length > 0) {
            grid.scrollRowIntoView(matches[0]);
            grid.setSelectedRows(matches);
            var vp = grid.getViewport();
            // For now just loading all columns. In future limit the 3rd and 4th parameters to just be the columns that are visible in the viewport.
            loader.ensureData(vp.top, vp.bottom, 0, columns.length);
          }
        }
      });
    } 
    // Otherwise, unselect all rows
    else {
      grid.setSelectedRows([]);
    }
    
  }

  this.set_sort_order = function(sort_field, sort_direction) {
    loader.setSort(sort_field, sort_direction);
    var vp = grid.getViewport();
    // For now just loading all columns. In future limit the 3rd and 4th parameters to just be the columns that are visible in the viewport.
    loader.ensureData(vp.top, vp.bottom, 0, columns.length);
  }

  function doSort(field, sortAsc){

    var selectedRows = grid.getSelectedRows();
    var selectedRowsData = [];

    if( selectedRows.length > 0 ) {
        var indices = [];
        var min_of_selected_rows = Math.min.apply(Math, selectedRows);
        var max_of_selected_rows = Math.max.apply(Math, selectedRows);
        loader.ensureData(min_of_selected_rows, max_of_selected_rows+1, 0, columns.length, finishSort);
    }
    else {
      finishSort();
    }

    function finishSort(){
      for(var i=0; i<selectedRows.length; i++) {
        selectedRowsData.push( grid.getData()[selectedRows[i]].Index )
      }
      loader.setSort(field, sortAsc ? 1 : -1);
      var vp = grid.getViewport();

      // For now just loading all columns. In future limit the 3rd and 4th parameters to just be the columns that are visible in the viewport.
      loader.ensureData(vp.top, vp.bottom, 0, columns.length, function(){
        if(selectedRowsData.length > 0){
          self.select_simulations(selectedRowsData);
        } 
      });

      self.container.trigger("variable-sort-changed", [$.inArray(field, parameters.variable_names), sortAsc ? 1 : -1, field]);
    }
  }

  this.highlight_variable = function(variable_type, variable_index)
  {
    columnIndex = 0;

    if(variable_type == 'input')
      columnIndex = variable_index + 1;
    if(variable_type == 'output')
      columnIndex = variable_index + 1 + parameters.inputs.length;

    highlightVariableAbsoluteIndex(columnIndex);
  }

  function highlightVariableAbsoluteIndex(columnIndex)
  {
    // Clear color and background styles on all table cells
    for(var i = 0; i < columns.length; i++) {
      columns[i].formatter = undefined;
      columns[i].cssClass = columns[i].cssClass.replace(' highlight','');
    }

    columns[columnIndex].formatter = Slick.Formatters.RangeFormatter;
    columns[columnIndex].cssClass = columns[columnIndex].cssClass + " highlight";

    if( grid ) {
      // Calling .setData() forces the grid to re-render everything, including currently visible rows. Other methods are more efficient but don't update the currently visible rows.
      grid.setData(loader.data);
      grid.render();
    }

  }

  this.updateColorMap = function(colorMapName) {
    // Swap in the new color map
    colorMapper.colorswitcher("setUpColorMapsForAllColumns", colorMapName, columns);
    // Update grid with new color map and make it show the new colors
    if( grid ) {
      grid.setColumns(columns);
      // Calling .setData() forces the grid to re-render everything, including currently visible rows. Other methods are more efficient but don't update the currently visible rows.
      grid.setData(loader.data);
      grid.render();
    }
    // // Change the colors of waveforms in the viewer and dendrogram
    // self.setWaveformColorsPerSelectedColumn();
  }

  this.getSelectedColumn = function() {
    // get the currently selected column
    var currentlySelectedColumn = -1;
    for(var i = 0, len = columns.length; i < len; i++) {
      if (columns[i].headerCssClass.indexOf(" selected") > -1) {
          currentlySelectedColumn = columns[i];
          break;
      }
    }
    return currentlySelectedColumn;
  }

  this.update = function(parameters)
  {
    if(parameters.highlight)
      this.highlight_variable(parameters.highlight[0], parameters.highlight[1]);

    // Used to select row in simulation table when point in scatterplot is clicked
    if(parameters.simulation_selection)
    {
      this.select_simulations(parameters.simulation_selection, false);
    }

    // Used to restore selected row from bookmark
    if(parameters.unsorted_simulation_selection) {
      grid.setSelectedRows(parameters.unsorted_simulation_selection);
      grid.scrollRowIntoView(parameters.unsorted_simulation_selection[0]);
    }

    if(parameters.sort_field && parameters.sort_direction) {
      // First we do the sort
      doSort( parameters.sort_field, (parameters.sort_direction > 0 ? true : false) );

      // Now we set the state of the sort button in the header
      var button = $.grep( grid.getColumns(), function(elementOfArray, indexInArray){ return elementOfArray.name == parameters.sort_field } )[0].header.buttons[0];
      if (parameters.sort_direction > 0){
        button.cssClass = 'icon-sort-ascending';
        button.command = 'sort-descending';
        button.tooltip = 'Sort descending'
        doSort(parameters.sort_field, true);
      }
      else {
        button.cssClass = 'icon-sort-descending';
        button.command = 'sort-ascending';
        button.tooltip = 'Sort ascending';
        doSort(parameters.sort_field, false);
      }
      grid.setColumns(grid.getColumns());

      // Another way of setting the sort column icon, but this does not set the button's direction under some circumstances. Leaving here for now in case we run into problems with the other method.
      //var selector = "div#cca-simulation-table-slickgrid div.slick-header-columns div.slick-header-column[title=" + parameters.sort_field + "] div.slick-header-button";
      //var sort_direction_class = parameters.sort_direction > 0 ? "icon-sort-ascending" : "icon-sort-descending";
      //$(selector).removeClass("icon-sort-off").addClass(sort_direction_class);
    }
  }

  this.update(parameters);

  this.resizeGridCanvas = function()
  {
    grid.resizeCanvas();
  }

  // Start a loader for accessing table data with slickgrid ...
  var loader = new Slick.Data.CCALoader(server_root + "workers/", workerId, parameters.row_count, parameters.variable_names, parameters.all_column_indexes);
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
