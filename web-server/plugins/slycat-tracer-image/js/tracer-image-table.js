/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

////////////////////////////////////////////////////////////////////////////////////////
// Slickgrid-based data table widget, for use with the CCA model.
define("tracer-image-table-widget", ["d3"], function(d3) {
  $.widget("tracer_image.table", {
    options:
    {
      "server-root" : "",
      mid : null,
      aid : null,
      metadata : null,
      statistics : null,
      inputs : [],
      outputs : [],
      others : [],
      images : [],
      ratings : [],
      categories : [],
      "row-selection" : [],
      //"variable-selection": [],
      "sort-variable" : null,
      "sort-order" : null,
      //"image-variable" : null,
      //"x-variable" : null,
      //"y-variable" : null,
      colormap : null,
      hidden_simulations : [],
    },

    _create: function()
    {
      var self = this;

      function value_formatter(value)
      {
        return value == null ? "&nbsp;" : (value + "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      }

      function cell_formatter(row, cell, value, columnDef, dataContext)
      {
        if(columnDef.colormap)
          return "<div class='highlightWrapper" + (value==null ? " null" : "") + ( d3.hcl(columnDef.colormap(value)).l > 50 ? " light" : " dark") + "' style='background:" + columnDef.colormap(value) + "'>" + value_formatter(value) + "</div>";
        else if(value==null)
          return "<div class='highlightWrapper" + (value==null ? " null" : "") + "'>" + value_formatter(value) + "</div>";
        return value_formatter(value);
      }

      function editable_cell_formatter(row, cell, value, columnDef, dataContext)
      {
        if(columnDef.colormap)
          return "<div class='highlightWrapper" + (value==null ? " null" : "") + ( d3.hcl(columnDef.colormap(value)).l > 50 ? " light" : " dark") + "' style='background:" + columnDef.colormap(value) + "'>" + value_formatter(value) + "</div>";
        else if(value==null)
          return "<div class='highlightWrapper" + (value==null ? " null" : "") + "'>" + value_formatter(value) + "</div>";
        return value_formatter(value);
      }

      function set_sort(column, order)
      {
        self.data.set_sort(column, order);
        self.data.get_indices("sorted", self.options["row-selection"], function(sorted_rows)
                              {
                                self.grid.invalidate();
                                self.trigger_row_selection = false;
                                self.grid.setSelectedRows(sorted_rows);
                                self.grid.resetActiveCell();
                                if(sorted_rows.length)
                                  self.grid.scrollRowToTop(Math.min.apply(Math, sorted_rows));
                                self.element.trigger("variable-sort-changed", [column, order]);
                              });
      }

      function make_column(column_index, header_class, cell_class, formatter)
      {
        var column = {
          id : column_index,
          field : column_index,
          name : self.options.metadata["column-names"][column_index],
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
                cssClass : self.options["sort-variable"] == column_index ? (self.options["sort-order"] == "ascending" ? "icon-sort-ascending" : "icon-sort-descending") : "icon-sort-off",
                tooltip : self.options["sort-variable"] == column_index ? (self.options["sort-order"] == "ascending" ? "Sort descending" : "Sort ascending") : "Sort ascending",
                command : self.options["sort-variable"] == column_index ? (self.options["sort-order"] == "ascending" ? "sort-descending" : "sort-ascending") : "sort-ascending",
              },
            ]
          }
        };
        /*
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
         // Special options for numeric columns
         if( self.options.metadata["column-types"][column_index] != "string" && self.options.metadata["column-count"]-1 != column_index ) {
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
         */
        return column;
      }

      self.columns = [];

      self.columns.push(make_column(self.options.metadata["column-count"]-1, "headerSimId", "rowSimId", cell_formatter));
      for(var i in self.options.inputs)
        self.columns.push(make_column(self.options.inputs[i], "headerInput", "rowInput", cell_formatter));
      for(var i in self.options.outputs)
        self.columns.push(make_column(self.options.outputs[i], "headerOutput", "rowOutput", cell_formatter));
      for(var i in self.options.ratings)
        self.columns.push(make_column(self.options.ratings[i], "headerRating", "rowRating", editable_cell_formatter));
      for(var i in self.options.categories)
        self.columns.push(make_column(self.options.categories[i], "headerCategory", "rowCategory", editable_cell_formatter));
      for(var i in self.options.others)
        self.columns.push(make_column(self.options.others[i], "headerOther", "rowOther", cell_formatter));

      self.data = new self._data_provider({
        server_root : self.options["server-root"],
        mid : self.options.mid,
        aid : self.options.aid,
        metadata : self.options.metadata,
        sort_column : self.options["sort-variable"],
        sort_order : self.options["sort-order"],
        inputs : self.options.inputs,
        outputs : self.options.outputs,
        indexOfIndex : self.options.metadata["column-count"]-1,
        hidden_simulations : self.options.hidden_simulations,
      });

      self.trigger_row_selection = true;

      self.grid = new Slick.Grid(self.element, self.data, self.columns, {
        explicitInitialization : true,
        enableColumnReorder : false,
        editable : true,
        editCommandHandler : self._editCommandHandler,
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
                                             set_sort(column.id, "ascending");
                                           }
                                           else if(command == "sort-descending")
                                           {
                                             button.cssClass = 'icon-sort-descending';
                                             button.command = 'sort-ascending';
                                             button.tooltip = 'Sort ascending';
                                             set_sort(column.id, "descending");
                                           }
                                           /*
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
                                            if(self.options.metadata["column-types"][self.columns[i].id] != "string" && self.options.metadata["column-count"]-1 != self.columns[i].id){
                                            self.columns[i].header.buttons[1].cssClass = "icon-x-off";
                                            self.columns[i].header.buttons[1].tooltip = "Set as x variable";
                                            self.columns[i].header.buttons[1].command = "x-on";
                                            grid.updateColumnHeader(self.columns[i].id);
                                            }
                                            }
                                            button.cssClass = 'icon-x-on';
                                            button.command = '';
                                            button.tooltip = 'Current x variable';
                                            self.element.trigger("x-selection-changed", column.id);
                                            }
                                            else if(command == "y-on")
                                            {
                                            for(var i in self.columns)
                                            {
                                            if(self.options.metadata["column-types"][self.columns[i].id] != "string" && self.options.metadata["column-count"]-1 != self.columns[i].id){
                                            self.columns[i].header.buttons[2].cssClass = "icon-y-off";
                                            self.columns[i].header.buttons[2].tooltip = "Set as y variable";
                                            self.columns[i].header.buttons[2].command = "y-on";
                                            grid.updateColumnHeader(self.columns[i].id);
                                            }
                                            }
                                            button.cssClass = 'icon-y-on';
                                            button.command = '';
                                            button.tooltip = 'Current y variable';
                                            self.element.trigger("y-selection-changed", column.id);
                                            }
                                            */
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
      /*
       self.grid.onHeaderClick.subscribe(function (e, args)
       {
       if( !self._array_equal([args.column.field], self.options["variable-selection"]) &&
       ( (self.options.metadata["column-types"][args.column.id] != "string")
       /* || (self.options["categories"].indexOf(args.column.field) != -1) star/ )
       )
       {
       self.options["variable-selection"] = [args.column.field];
       self._color_variables(self.options["variable-selection"]);
       self.element.trigger("variable-selection-changed", [self.options["variable-selection"]]);
       }
       });
       self._color_variables(self.options["variable-selection"]);
       */
      self.grid.init();

      self.data.get_indices("sorted", self.options["row-selection"], function(sorted_rows)
                            {
                              self.trigger_row_selection = false;
                              self.grid.setSelectedRows(sorted_rows);
                              self.grid.resetActiveCell();
                              if(sorted_rows.length)
                                self.grid.scrollRowToTop(Math.min.apply(Math, sorted_rows));
                            });
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
      self.data.get_indices("sorted", self.options["row-selection"], function(sorted_rows)
                            {
                              self.trigger_row_selection = false;
                              self.grid.setSelectedRows(sorted_rows);
                              self.grid.resetActiveCell();
                              if(sorted_rows.length)
                                self.grid.scrollRowToTop(Math.min.apply(Math, sorted_rows));
                            });
    },

    _setOption: function(key, value)
    {
      var self = this;

      if(key == "row-selection")
      {
        // Unexpectedly at this point self.options[key] has already been set to value, so this always returns even when the row-selection is unique
        // if(self._array_equal(self.options[key], value))
        //   return;

        self.options[key] = value;
        self.data.get_indices("sorted", value, function(sorted_rows)
                              {
                                self.trigger_row_selection = false;
                                self.grid.setSelectedRows(sorted_rows);
                                self.grid.resetActiveCell();
                                if(sorted_rows.length)
                                  self.grid.scrollRowToTop(Math.min.apply(Math, sorted_rows));
                              });
      }
      /*else if(key == "variable-selection")
       {
       if(self._array_equal(self.options[key], value))
       return;

       self.options[key] = value;
       self._color_variables(value);
       }*/
      else if(key == "colormap")
      {
        self.options[key] = value;
        self._color_variables(self.options["variable-selection"]);
      }
      /*
       else if(key == "x-variable")
       {
       self.options[key] = value;
       self._set_selected_x();
       }
       else if(key == "y-variable")
       {
       self.options[key] = value;
       self._set_selected_y();
       }
       else if(key == "image-variable")
       {
       self.options[key] = value;
       self._set_selected_image();
       }
       */
      else if(key == "metadata")
      {
        self.options[key] = value;
        self._color_variables(self.options["variable-selection"]);
      }
      else if(key == "statistics")
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
    },

    /*
     _set_selected_x: function()
     {
     var self = this;
     for(var i in self.columns)
     {
     if(self.options.metadata["column-types"][self.columns[i].id] != "string" && self.options.metadata["column-count"]-1 != self.columns[i].id){
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
     },

     _set_selected_y: function()
     {
     var self = this;
     for(var i in self.columns)
     {
     if(self.options.metadata["column-types"][self.columns[i].id] != "string" && self.options.metadata["column-count"]-1 != self.columns[i].id){
     if( self.columns[i].id == self.options["y-variable"]){
     self.columns[i].header.buttons[0].cssClass = "icon-y-on";
     self.columns[i].header.buttons[0].tooltip = "Current y variable";
     self.columns[i].header.buttons[0].command = "";
     } else {
     self.columns[i].header.buttons[0].cssClass = "icon-y-off";
     self.columns[i].header.buttons[0].tooltip = "Set as y variable";
     self.columns[i].header.buttons[0].command = "y-on";
     }
     self.grid.updateColumnHeader(self.columns[i].id);
     }
     }
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
     */
    _color_variables: function(variables)
    {
      var self = this;

      var columns = self.grid.getColumns();
      for(var i in columns)
      {
        var column = columns[i];
        if(self.options.colormap !== null && $.inArray(column.id, variables) != -1)
        {
          // Make a copy of our global colormap, then adjust its domain to match our column-specific data.
          column.colormap = self.options.colormap.copy();

          if(self.options.metadata["column-types"][column.id] != "string")
          {
            var new_domain = []
            var domain_scale = d3.scale.linear()
                  .domain([0, column.colormap.range().length])
                  .range([self.options.statistics[column.id]["min"], self.options.statistics[column.id]["max"]]);
            for(var i in column.colormap.range())
              new_domain.push(domain_scale(i));
            column.colormap.domain(new_domain);
            self.grid.invalidate();
          }
          else
          {
            // Get all the values for the current column

            function getAllValues(column){
              $.ajax(
                {
                  type : "GET",
                  url : self.options['server-root'] + "models/" + self.options.mid + "/tables/"
                    + self.options.aid + "/arrays/0/chunk?rows=0-" + self.options.metadata['row-count'] + "&columns=" + column.id + "&sort=" + column.id + ":ascending",
                  success : function(result)
                  {

                    var uniqueValues = d3.set(result.data[0]).values();
                    var tempOrdinal = d3.scale.ordinal().domain(uniqueValues).rangePoints([0, 100], 0);

                    var domain_scale = d3.scale.linear()
                          .domain([0, column.colormap.range().length])
                          .range([0, 100]);

                    var new_domain = []
                    for(var i in column.colormap.range())
                      new_domain.push(domain_scale(i));

                    var tempColormap = self.options.colormap.copy();
                    tempColormap.domain(new_domain);

                    var rgbRange = [];
                    for(var i=0; i<uniqueValues.length; i++)
                    {
                      rgbRange.push( tempColormap( tempOrdinal(uniqueValues[i]) ) );
                    }
                    var ordinalColormap = d3.scale.ordinal().domain(uniqueValues).range(rgbRange);

                    column.colormap = ordinalColormap;

                    self.grid.invalidate();
                  },
                  error: function(request, status, reason_phrase)
                  {
                    console.log("Error retrieving data table: " + reason_phrase);
                  }
                });
            }
            getAllValues(column);
          }

          column.cssClass = column.cssClass.split(" ")[0] + " highlight";
        }
        else
        {
          column.colormap = null;
          column.cssClass = column.cssClass.split(" ")[0];
          self.grid.invalidate();
        }
      }
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

      self.server_root = parameters.server_root
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

      self.pages = {};
      self.page_size = 50;

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

        if(!(page in self.pages))
        {
          var row_begin = page_begin;
          var row_end = (page + 1) * self.page_size;

          var sort = "";
          if(self.sort_column !== null && self.sort_order !== null)
            sort = "&sort=" + self.sort_column + ":" + self.sort_order;

          $.ajax(
            {
              type : "GET",
              url : self.server_root + "models/" + self.mid + "/tables/" + self.aid + "/arrays/0/chunk?rows=" + row_begin + "-" + row_end + "&columns=" + column_begin + "-" + column_end + "&index=Index" + sort,
              async : false,
              success : function(data)
              {
                self.pages[page] = [];
                for(var i=0; i < data.rows.length; i++)
                {
                  result = {};
                  for(var j = column_begin; j != column_end; ++j)
                    result[j] = data.data[j][i];
                  self.pages[page].push(result);
                }
              },
              error: function(request, status, reason_phrase)
              {
                console.log("error", request, status, reason_phrase);
              }
            });
        }

        return self.pages[page][index - page_begin];
      }

      self.getItemMetadata = function(index)
      {
        var row = this.getItem(index);
        var column_end = self.analysis_columns.length;
        var cssClasses = "";
        for(var i=0; i != column_end; i++) {
          if(row[ self.analysis_columns[i] ]==null) {
            cssClasses += "nullRow";
          }
        }
        if( $.inArray( row[self.indexOfIndex], self.hidden_simulations ) != -1 ) {
          cssClasses += "hiddenRow";
        }
        if(cssClasses != "")
          return {"cssClasses" : cssClasses};
        return null;
      }

      self.set_sort = function(column, order)
      {
        if(column == self.sort_column && order == self.sort_order)
          return;
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

        var sort = "";
        if(self.sort_column !== null && self.sort_order !== null)
          sort = "&sort=" + self.sort_column + ":" + self.sort_order;

        var row_string = "";
        for(var i = 0; i < rows.length; ++i)
        {
          row_string += rows[i];
          break
        }
        for(var i = 1; i < rows.length; ++i)
        {
          row_string += ",";
          row_string += rows[i];
        }

        function is_little_endian()
        {
          if(this.result === undefined)
            this.result = ((new Uint32Array((new Uint8Array([1,2,3,4])).buffer))[0] === 0x04030201);
          return this.result;
        }

        var request = new XMLHttpRequest();
        request.open("GET", self.server_root + "models/" + self.mid + "/tables/" + self.aid + "/arrays/0/" + direction + "-indices?rows=" + row_string + "&index=Index&byteorder=" + (is_little_endian() ? "little" : "big") + sort);
        request.responseType = "arraybuffer";
        request.callback = callback;
        request.onload = function(e)
        {
          this.callback(new Int32Array(this.response));
        }
        request.send();
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
});
