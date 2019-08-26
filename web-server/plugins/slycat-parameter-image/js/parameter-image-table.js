/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

////////////////////////////////////////////////////////////////////////////////////////
// Slickgrid-based data table widget, for use with the CCA model.

import d3 from "d3";
import * as chunker from "js/chunker";
import * as table_helpers from "js/slycat-table-helpers";
import "jquery-ui";
import "slickgrid/lib/jquery.event.drag-2.3.0";
import "slickgrid/lib/jquery.event.drop-2.3.0";
import "slickgrid/slick.core";
import "slickgrid/slick.grid";
import "slickgrid/plugins/slick.rowselectionmodel";
import "slickgrid/plugins/slick.headerbuttons";
import "slickgrid/plugins/slick.autotooltips";

$.widget("parameter_image.table",
{
  options:
  {
    "server-root" : "",
    mid : null,
    aid : null,
    metadata : null,
    inputs : [],
    outputs : [],
    others : [],
    images : [],
    ratings : [],
    categories : [],
    "row-selection" : [],
    "variable-selection": [],
    "sort-variable" : null,
    "sort-order" : null,
    "image-variable" : null,
    "x-variable" : null,
    "y-variable" : null,
    x_y_variables : {x: null, y: null},
    colorscale : null,
    hidden_simulations : [],
  },

  _create: function()
  {
    var self = this;

    // Initialize x_y_variables object
    self.options.x_y_variables.x = self.options['x-variable'];
    self.options.x_y_variables.y = self.options['y-variable'];


    function value_formatter(value)
    {
      return value == null ? "&nbsp;" : (value + "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }

    function cell_formatter(row, cell, value, columnDef, dataContext)
    {
      if(columnDef.colorscale)
        return "<div class='highlightWrapper" + (value==null ? " null" : "") + ( d3.hcl(columnDef.colorscale(value)).l > 50 ? " light" : " dark") + "' style='background:" + columnDef.colorscale(value) + "'>" + value_formatter(value) + "</div>";
      else if(value==null)
        return "<div class='highlightWrapper" + (value==null ? " null" : "") + "'>" + value_formatter(value) + "</div>";
      return value_formatter(value);
    }

    function editable_cell_formatter(row, cell, value, columnDef, dataContext)
    {
      if(columnDef.colorscale)
        return "<div class='highlightWrapper" + (value==null ? " null" : "") + ( d3.hcl(columnDef.colorscale(value)).l > 50 ? " light" : " dark") + "' style='background:" + columnDef.colorscale(value) + "'>" + value_formatter(value) + "</div>";
      else if(value==null)
        return "<div class='highlightWrapper" + (value==null ? " null" : "") + "'>" + value_formatter(value) + "</div>";
      return value_formatter(value);
    }

    function set_sort(column, order)
    {
      self.data.set_sort(column, order);
      self.grid.invalidate();
      table_helpers._set_selected_rows_no_trigger(self);
      self.element.trigger("variable-sort-changed", [column, order]);
    }

    function get_variable_label(variable)
    {
      if(window.store.getState().variableAliases[variable] !== undefined)
      {
        return window.store.getState().variableAliases[variable];
      }
      
      return self.options.metadata["column-names"][variable]
    }

    function make_column(column_index, header_class, cell_class, formatter)
    {
      var column = {
        id : column_index,
        field : column_index,
        name : get_variable_label(column_index),
        toolTip : get_variable_label(column_index),
        sortable : false,
        headerCssClass : header_class,
        cssClass : cell_class,
        formatter : formatter,
        width: 100,
        header :
        {
          buttons :
          [
            {
              cssClass : self.options["sort-variable"] == column_index ? (self.options["sort-order"] == "asc" ? "icon-sort-ascending" : "icon-sort-descending") : "icon-sort-off",
              tooltip : self.options["sort-variable"] == column_index ? (self.options["sort-order"] == "asc" ? "Sort descending" : "Sort ascending") : "Sort ascending",
              command : self.options["sort-variable"] == column_index ? (self.options["sort-order"] == "asc" ? "sort-descending" : "sort-ascending") : "sort-ascending",
            },
          ]
        }
      };
      // Special options for image columns
      if( self.options.images.indexOf(column_index) > -1 ) {
        column.headerCssClass += " headerImage";
        column.header.buttons.push(
          {
            cssClass : self.options["image-variable"] == column_index ? "icon-image-on" : "icon-image-off",
            tooltip :  self.options["image-variable"] == column_index ? "Current image variable" : "Set as image variable",
            command :  self.options["image-variable"] == column_index ? "" : "image-on",
          }
        );
      }
      // Special options for non-image and non-index columns
      else if( self.options.metadata["column-count"]-1 != column_index ) {
        column.headerCssClass += " headerNumeric";
        column.header.buttons.push(
          {
            cssClass : self.options["x-variable"] == column_index ? "icon-x-on" : "icon-x-off",
            tooltip :  self.options["x-variable"] == column_index ? "Current x variable" : "Set as x variable",
            command :  self.options["x-variable"] == column_index ? "" : "x-on",
          },
          {
            cssClass : self.options["y-variable"] == column_index ? "icon-y-on" : "icon-y-off",
            tooltip :  self.options["y-variable"] == column_index ? "Current y variable" : "Set as y variable",
            command :  self.options["y-variable"] == column_index ? "" : "y-on",
          }
        );
      }
      return column;
    }

    self.columns = [];
    
    self.columns.push(make_column(self.options.metadata["column-count"]-1, "headerSimId", "rowSimId", cell_formatter));
    for(var i in self.options.inputs)
      self.columns.push(make_column(self.options.inputs[i],  "headerInput",  "rowInput",  cell_formatter));
    for(var i in self.options.outputs)
      self.columns.push(make_column(self.options.outputs[i], "headerOutput", "rowOutput", cell_formatter));
    for(var i in self.options.others)
      self.columns.push(make_column(self.options.others[i],  "headerOther",  "rowOther",  cell_formatter));

    self.data = new self._data_provider({
      api_root : self.options.api_root,
      mid : self.options.mid,
      aid : self.options.aid,
      metadata : self.options.metadata,
      sort_column : self.options["sort-variable"],
      sort_order : self.options["sort-order"],
      inputs : self.options.inputs,
      outputs : self.options.outputs,
      indexOfIndex : self.options.metadata["column-count"]-1,
      hidden_simulations : self.options.hidden_simulations,
      x_y_variables : self.options.x_y_variables,
      });

    self.trigger_row_selection = true;

    self.grid = new Slick.Grid(self.element, self.data, self.columns, {
      explicitInitialization : true, 
      enableColumnReorder : false, 
      editable : true, 
      editCommandHandler : self._editCommandHandler,
    });

    self.data.onDataLoaded.subscribe(function (e, args) {
      for (var i = args.from; i <= args.to; i++) {
        self.grid.invalidateRow(i);
      }
      self.grid.render();
    });

    var header_buttons = new Slick.Plugins.HeaderButtons();
    header_buttons.onCommand.subscribe(function(e, args)
    {
      var column = args.column;
      var button = args.button;
      var command = args.command;
      var grid = args.grid;

      if(command == "sort-ascending" || command == "sort-descending"){
        for(var i in self.columns)
        {
          self.columns[i].header.buttons[0].cssClass = "icon-sort-off";
          self.columns[i].header.buttons[0].tooltip = "Sort ascending";
          self.columns[i].header.buttons[0].command = "sort-ascending";
          grid.updateColumnHeader(self.columns[i].id);
        }
      }

      if(command == "sort-ascending")
      {
        button.cssClass = 'icon-sort-ascending';
        button.command = 'sort-descending';
        button.tooltip = 'Sort descending';
        set_sort(column.id, "asc");
      }
      else if(command == "sort-descending")
      {
        button.cssClass = 'icon-sort-descending';
        button.command = 'sort-ascending';
        button.tooltip = 'Sort ascending';
        set_sort(column.id, "desc");
      }
      else if(command == "image-on")
      {
        for(var i=0; i < self.options.images.length; i++)
        {
          var index = grid.getColumnIndex(self.options.images[i]);
          self.columns[index].header.buttons[1].cssClass = "icon-image-off";
          self.columns[index].header.buttons[1].tooltip = "Set as image variable";
          self.columns[index].header.buttons[1].command = "image-on";
          grid.updateColumnHeader(self.columns[index].id);
        }
        button.cssClass = 'icon-image-on';
        button.command = '';
        button.tooltip = 'Current image variable';
        self.element.trigger("images-selection-changed", column.id);
      }
      else if(command == "x-on")
      {
        for(var i in self.columns)
        {
          if(self.options.images.indexOf(self.columns[i].id) == -1 && self.options.metadata["column-count"]-1 != self.columns[i].id){
            self.columns[i].header.buttons[1].cssClass = "icon-x-off";
            self.columns[i].header.buttons[1].tooltip = "Set as x variable";
            self.columns[i].header.buttons[1].command = "x-on";
            grid.updateColumnHeader(self.columns[i].id);
          }
        }
        button.cssClass = 'icon-x-on';
        button.command = '';
        button.tooltip = 'Current x variable';
        self.options['x-variable'] = column.id;
        self.options.x_y_variables.x = column.id;
        grid.invalidate();
        self.element.trigger("x-selection-changed", column.id);
      }
      else if(command == "y-on")
      {
        for(var i in self.columns)
        {
          if(self.options.images.indexOf(self.columns[i].id) == -1 && self.options.metadata["column-count"]-1 != self.columns[i].id){
            self.columns[i].header.buttons[2].cssClass = "icon-y-off";
            self.columns[i].header.buttons[2].tooltip = "Set as y variable";
            self.columns[i].header.buttons[2].command = "y-on";
            grid.updateColumnHeader(self.columns[i].id);
          }
        }
        button.cssClass = 'icon-y-on';
        button.command = '';
        button.tooltip = 'Current y variable';
        self.options['y-variable'] = column.id;
        self.options.x_y_variables.y = column.id;
        grid.invalidate();
        self.element.trigger("y-selection-changed", column.id);
      }
    });

    self.grid.registerPlugin(header_buttons);
    self.grid.registerPlugin(new Slick.AutoTooltips({enableForHeaderCells:true}));

    self.grid.setSelectionModel(new Slick.RowSelectionModel());
    self.grid.onSelectedRowsChanged.subscribe(function(e, selection)
    {
      // Don't trigger a selection event unless the selection was changed by user interaction (i.e. not outside callers or changing the sort order).
      if(self.trigger_row_selection)
      {
        self.data.get_indices("unsorted", selection.rows, function(unsorted_rows)
        {
          self.options["row-selection"] = unsorted_rows;
          self.element.trigger("row-selection-changed", [unsorted_rows]);
        });
      }
      self.trigger_row_selection = true;
    });
    self.grid.onHeaderClick.subscribe(function (e, args)
    {
      if( !self._array_equal([args.column.field], self.options["variable-selection"]) && 
          self.options.images.indexOf(args.column.field) == -1
        )
      {
        self.options["variable-selection"] = [args.column.field];
        self.element.trigger("variable-selection-changed", [self.options["variable-selection"]]);
      }
    });

    self._color_variables(self.options["variable-selection"]);

    self.grid.init();

    table_helpers._set_selected_rows_no_trigger(self);

    const update_variable_aliases = () => {
      let label;

      for(var i in self.columns)
      {
        label = get_variable_label(self.columns[i].id);
        // Update column name and tooltip if it has changed
        if(label != self.columns[i].name)
        {
          self.columns[i].name = label;
          self.columns[i].tooltip = label;
          self.grid.updateColumnHeader(self.columns[i].id, label, label);
        }
      }
    };

    window.store.subscribe(update_variable_aliases);
  },

  resize_canvas: function()
  {
    var self = this;
    self.grid.resizeCanvas();
  },

  update_data: function()
  {
    var self = this;
    self.data.invalidate();
    self.grid.invalidate();
    table_helpers._set_selected_rows_no_trigger(self);
  },

  _setOption: function(key, value)
  {
    var self = this;

    if(key == "row-selection")
    {
      self.options[key] = value;
      table_helpers._set_selected_rows_no_trigger(self);
    }
    else if(key == "variable-selection")
    {
      if(self._array_equal(self.options[key], value))
        return;

      self.options[key] = value;
      self._color_variables(value);
    }
    else if(key == "colorscale")
    {
      self.options[key] = value;
      self._color_variables(self.options["variable-selection"]);
    }
    else if(key == "x-variable")
    {
      self.options[key] = value;
      self.options.x_y_variables.x = value;
      self._set_selected_x();
    }
    else if(key == "y-variable")
    {
      self.options[key] = value;
      self.options.x_y_variables.y = value;
      self._set_selected_y();
    }
    else if(key == "image-variable")
    {
      self.options[key] = value;
      self._set_selected_image();
    }
    else if(key == "metadata")
    {
      self.options[key] = value;
      self._color_variables(self.options["variable-selection"]);
    }
    else if(key == "hidden_simulations")
    {
      self.options[key] = value;
      self.data.invalidate();
      self.grid.invalidate();
    }
    else if(key == "jump_to_simulation")
    {
      self.data.get_indices("sorted", [value], function(sorted_rows)
      {
        if(sorted_rows.length)
        {
          var rowIndex = Math.min.apply(Math, sorted_rows);
          self.grid.scrollRowToTop(rowIndex);
          // Get all the columns
          self.grid.getColumns().forEach(function(col){
            // Flash each cell
            self.grid.flashCell(rowIndex, self.grid.getColumnIndex(col.id));
          })
        }

      });
    }
  },

  _set_selected_x: function()
  {
    var self = this;
    for(var i in self.columns)
    {
      if(self.options.images.indexOf(self.columns[i].id) == -1 && self.options.metadata["column-count"]-1 != self.columns[i].id){
        if( self.columns[i].id == self.options["x-variable"]){
          self.columns[i].header.buttons[1].cssClass = "icon-x-on";
          self.columns[i].header.buttons[1].tooltip = "Current x variable";
          self.columns[i].header.buttons[1].command = "";
        } else {
          self.columns[i].header.buttons[1].cssClass = "icon-x-off";
          self.columns[i].header.buttons[1].tooltip = "Set as x variable";
          self.columns[i].header.buttons[1].command = "x-on";
        }
        self.grid.updateColumnHeader(self.columns[i].id);
      }
    }
    self.grid.invalidate();
  },

  _set_selected_y: function()
  {
    var self = this;
    for(var i in self.columns)
    {
      if(self.options.images.indexOf(self.columns[i].id) == -1 && self.options.metadata["column-count"]-1 != self.columns[i].id){
        if( self.columns[i].id == self.options["y-variable"]){
          self.columns[i].header.buttons[2].cssClass = "icon-y-on";
          self.columns[i].header.buttons[2].tooltip = "Current y variable";
          self.columns[i].header.buttons[2].command = "";
        } else {
          self.columns[i].header.buttons[2].cssClass = "icon-y-off";
          self.columns[i].header.buttons[2].tooltip = "Set as y variable";
          self.columns[i].header.buttons[2].command = "y-on";
        }
        self.grid.updateColumnHeader(self.columns[i].id);
      }
    }
    self.grid.invalidate();
  },

  _set_selected_image: function()
  {
    var self = this;
    for(var i=0; i < self.options.images.length; i++)
    {
      var index = self.grid.getColumnIndex(self.options.images[i]);
      if(self.columns[index].id == self.options["image-variable"]){
        self.columns[index].header.buttons[1].cssClass = "icon-image-on";
        self.columns[index].header.buttons[1].tooltip = "Current image variable";
        self.columns[index].header.buttons[1].command = "";
      } else {
        self.columns[index].header.buttons[1].cssClass = "icon-image-off";
        self.columns[index].header.buttons[1].tooltip = "Set as image variable";
        self.columns[index].header.buttons[1].command = "image-on";
      }
      self.grid.updateColumnHeader(self.columns[index].id);
    }
  },

  _color_variables: function(variables)
  {
    var self = this;

    var columns = self.grid.getColumns();
    for(var i in columns)
    {
      var column = columns[i];
      if(self.options.colorscale !== null && $.inArray(column.id, variables) != -1)
      {
        column.colorscale = self.options.colorscale;
        column.cssClass = column.cssClass.split(" ")[0] + " highlight";
      }
      else
      {
        column.colorscale = null;
        column.cssClass = column.cssClass.split(" ")[0];
      }
    }
    self.grid.invalidate();
  },

  _editCommandHandler: function (item,column,editCommand) {
    console.log("editCommandHandler called");
    editCommand.execute();
    // To Do: Attempt to save edit and undo it if Ajax call returns error
    //editCommand.undo();
  },

  _data_provider: function(parameters)
  {
    var self = this;

    self.api_root = parameters.api_root
    self.mid = parameters.mid;
    self.aid = parameters.aid;
    self.metadata = parameters.metadata;
    self.sort_column = parameters.sort_column;
    self.sort_order = parameters.sort_order;
    self.inputs = parameters.inputs;
    self.outputs = parameters.outputs;
    self.analysis_columns = self.inputs.concat(self.outputs);
    self.indexOfIndex = parameters.indexOfIndex;
    self.hidden_simulations = parameters.hidden_simulations;
    self.ranked_indices = {};
    self.x_y_variables = parameters.x_y_variables;

    self.pages = {};
    self.pages_in_progress = {};
    self.page_size = 50;

    self.onDataLoaded = new Slick.Event();

    self.getLength = function()
    {
      return self.metadata["row-count"];
    }

    self.getItem = function(index)
    {
      var column_begin = 0;
      var column_end = self.metadata["column-count"];
      var page = Math.floor(index / self.page_size);
      var page_begin = page * self.page_size;

      if(self.pages_in_progress[page])
      {
        return null;
      }

      if(!(page in self.pages))
      {
        self.pages_in_progress[page] = true;
        var row_begin = page_begin;
        var row_end = (page + 1) * self.page_size;

        var sort = "";
        if(self.sort_column !== null && self.sort_order !== null)
        {
          var sort_column = "a" + self.sort_column;
          var sort_order = self.sort_order;
          if(sort_order == 'ascending')
          {
            sort_order = 'asc';
          }
          else if(sort_order == 'descending')
          {
            sort_order = 'desc';
          }
          if(self.sort_column == self.metadata["column-count"]-1)
            sort_column = "index(0)";
          sort = "/order: rank(" + sort_column + ', "' + sort_order + '")';
        }

        $.ajax(
        {
          type : "GET",
          url : self.api_root + "models/" + self.mid + "/arraysets/" + self.aid + "/data?hyperchunks=0/" + column_begin + ":" + (column_end - 1) + "|index(0)" + sort + "/" + row_begin + ":" + row_end,
          success : function(data)
          {
            self.pages[page] = [];
            for(var i=0; i < data[0].length; i++)
            {
              let result = {};
              for(var j = column_begin; j != column_end; ++j)
              {
                result[j] = data[j][i];
              }
              self.pages[page].push(result);
            }
            self.pages_in_progress[page] = false;
            self.onDataLoaded.notify({from: row_begin, to: row_end});
          },
          error: function(request, status, reason_phrase)
          {
            console.log("error", request, status, reason_phrase);
          }
        });
        return null;
      }

      return self.pages[page][index - page_begin];
    }

    self.getItemMetadata = function(index)
    {
      var page = Math.floor(index / self.page_size);
      if((self.pages_in_progress[page]) || !(page in self.pages))
      {
        return null;
      }

      var row = this.getItem(index);
      // self.analysis_columns are the inputs and the outputs
      var column_end = self.analysis_columns.length;
      var cssClasses = "";
      // Add a hiddenRow class if the row has a null value in the currently assigned x or y variable
      if(row[self.x_y_variables.x] == null || row[self.x_y_variables.y] == null)
      {
        cssClasses += "hiddenRow ";
      }
      // Add a hiddenRow class if the row index is in the list of hidden_simulations
      if( $.inArray( row[self.indexOfIndex], self.hidden_simulations ) != -1 ) {
        cssClasses += "hiddenRow ";
      }
      if(cssClasses != "")
        return {"cssClasses" : cssClasses};
      return null;
    }

    self.set_sort = function(column, order)
    {
      if(column == self.sort_column && order == self.sort_order)
      {
        return;
      }
      self.sort_column = column;
      self.sort_order = order;
      self.pages = {};
    }

    self.get_indices = function(direction, rows, callback)
    {
      if(rows.length == 0)
      {
        callback([]);
        return;
      }
      // We have no sort column or order, so just returning the same rows as were asked for since they're in the same order
      if(self.sort_column == null || self.sort_order == null)
      {
        callback(rows);
      }
      else
      {
        if(self.ranked_indices[self.sort_column])
        {
          // we have data for this column, so figure out what to return
          var indices = self.ranked_indices[self.sort_column];
          // Reverse response indexes for descending sort order
          if(self.sort_order == 'desc')
          {
            var plain_array = [];
            for(var i=0; i<indices.length; i++)
            {
              plain_array.push(indices[i]);
            }
            indices = plain_array.reverse();
          }
          var response = []; 
          for(var i=0; i<rows.length; i++)
          {
            if(direction == "unsorted")
            {
              response.push( indices[ rows[i] ] );
            }
            else if(direction == "sorted")
            {
              response.push( indices.indexOf(rows[i]) );
            }
          }
          callback(new Int32Array(response));
        }
        else
        {
          if( self.sort_column == self.metadata["column-count"]-1 )
          {
            // we are sorting by the index column, so we can just make the data we need.
            self.ranked_indices[self.sort_column] = new Int32Array( d3.range(self.metadata["row-count"]) );
            self.get_indices(direction, rows, callback);
          }
          else
          {
            // we have no data for this column, so go retrieve it and call this function again.
            var request = new XMLHttpRequest();
            request.open("GET", self.api_root + "models/" + self.mid + "/arraysets/data-table/data?hyperchunks=0/rank(a" + self.sort_column + ',"asc")/...&byteorder=' + (chunker.is_little_endian() ? "little" : "big") );
            request.responseType = "arraybuffer";
            request.direction = direction;
            request.rows = rows;
            request.callback = callback;
            request.onload = function(e)
            {
              var indices = [];
              var data = new Int32Array(this.response);
              // Filtering out every other element in the reponse array, because it's full of extraneous 0 (zeros) for some reason.
              // Need to figure out why, but this is a fix for now.
              for(var i=0; i<data.length; i=i+2)
              {
                indices.push(data[i]);
              }
              self.ranked_indices[self.sort_column] = new Int32Array(indices);
              self.get_indices(this.direction, this.rows, this.callback);
            }
            request.send();
          }
        }
      }
    }

    self.invalidate = function()
    {
      self.pages = {};
    }
  },

  _array_equal: function(a, b)
  {
    return $(a).not(b).length == 0 && $(b).not(a).length == 0;
  },
});