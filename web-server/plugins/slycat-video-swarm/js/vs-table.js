/*
Copyright 2013 National Technology & Engineering Solutions of Sandia, LLC (NTESS). 
Under the terms of Contract DE-NA0003525 with NTESS, the U.S. Government 
retains certain rights in this software.
*/
// This code manages the slick grid table containing the meta-data,
// along with providing interaction between the panes.
//
// S. Martin
// 4/27/2017

/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/
import "jquery-ui/themes/base/all.css";
import "../css/vs-ui.css";
import "slickgrid/dist/styles/sass/slick.grid.scss";
import "slickgrid/dist/styles/sass/slick-default-theme.scss";
import "slickgrid/dist/styles/sass/slick.headerbuttons.scss";
import "css/slick-slycat-theme.scss";

import api_root from "js/slycat-api-root";
import d3 from "d3";
import _ from "lodash";
import {
  SlickRowSelectionModel,
  SlickAutoTooltips,
  SlickGrid,
  SlickEvent,
  SlickHeaderButtons,
} from "slickgrid";
import Sortable from "sortablejs";
window.Sortable = Sortable;

import * as chunker from "js/chunker";
import * as table_helpers from "js/slycat-table-helpers";

$.widget("vs.table", {
  options: {
    api_root: "",
    mid: null,
    aid: null,
    metadata: null,
    inputs: [],
    outputs: [],
    others: [],
    "row-selection": [],
    color_variable: null,
    sort_variable: null,
    sort_order: null,
    color_scale: null,
  },

  _create: function () {
    var self = this;

    function value_formatter(value) {
      return value == null
        ? "&nbsp;"
        : (value + "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function cell_formatter(row, cell, value, columnDef, dataContext) {
      if (columnDef.color_scale)
        return (
          "<div class='highlightWrapper" +
          (value == null ? " null" : "") +
          (d3.hcl(columnDef.color_scale(value)).l > 50 ? " light" : " dark") +
          "' style='background:" +
          columnDef.color_scale(value) +
          "'>" +
          value_formatter(value) +
          "</div>"
        );
      else if (value == null)
        return (
          "<div class='highlightWrapper" +
          (value == null ? " null" : "") +
          "'>" +
          value_formatter(value) +
          "</div>"
        );
      return value_formatter(value);
    }

    function set_sort(column, order) {
      self.data.set_sort(column, order);
      self.grid.invalidate();
      table_helpers._set_selected_rows_no_trigger(self);
      self.element.trigger("variable-sort-changed", [column, order]);
    }

    function make_column(column_index, header_class, cell_class) {
      return {
        id: column_index,
        field: column_index,
        name: self.options.metadata["column-names"][column_index],
        sortable: false,
        headerCssClass: header_class,
        cssClass: cell_class,
        formatter: cell_formatter,
        header: {
          buttons: [
            {
              cssClass:
                self.options.sort_variable == column_index
                  ? self.options.sort_order == "ascending"
                    ? "icon-sort-ascending"
                    : "icon-sort-descending"
                  : "icon-sort-off",
              tooltip:
                self.options.sort_variable == column_index
                  ? self.options.sort_order == "ascending"
                    ? "Sort descending"
                    : "Sort ascending"
                  : "Sort ascending",
              command:
                self.options.sort_variable == column_index
                  ? self.options.sort_order == "ascending"
                    ? "sort-descending"
                    : "sort-ascending"
                  : "sort-ascending",
            },
          ],
        },
      };
    }

    self.columns = [];
    self.columns.push(
      make_column(self.options.metadata["column-count"] - 1, "headerSimId", "rowSimId"),
    );
    for (var i in self.options.inputs)
      self.columns.push(make_column(self.options.inputs[i], "headerInput", "rowInput"));
    for (var i in self.options.outputs)
      self.columns.push(make_column(self.options.outputs[i], "headerOutput", "rowOutput"));
    for (var i in self.options.others)
      self.columns.push(make_column(self.options.others[i], "headerOther", "rowOther"));

    self.data = new self._data_provider({
      api_root: self.options.api_root,
      mid: self.options.mid,
      aid: self.options.aid,
      metadata: self.options.metadata,
      sort_column: self.options.sort_variable,
      sort_order: self.options.sort_order,
      inputs: self.options.inputs,
      outputs: self.options.outputs,
    });

    self.trigger_row_selection = true;

    self.grid = new SlickGrid(self.element.get(0), self.data, self.columns, {
      explicitInitialization: true,
      enableColumnReorder: false,
    });

    self.data.onDataLoaded.subscribe(function (e, args) {
      for (var i = args.from; i <= args.to; i++) {
        self.grid.invalidateRow(i);
      }
      self.grid.render();
    });

    var header_buttons = new SlickHeaderButtons();
    header_buttons.onCommand.subscribe(function (e, args) {
      var column = args.column;
      var button = args.button;
      var command = args.command;
      var grid = args.grid;

      for (var i in self.columns) {
        self.columns[i].header.buttons[0].cssClass = "icon-sort-off";
        self.columns[i].header.buttons[0].tooltip = "Sort ascending";
        self.columns[i].header.buttons[0].command = "sort-ascending";
        grid.updateColumnHeader(self.columns[i].id);
      }

      if (command == "sort-ascending") {
        button.cssClass = "icon-sort-ascending";
        button.command = "sort-descending";
        button.tooltip = "Sort descending";
        set_sort(column.id, "ascending");
      } else if (command == "sort-descending") {
        button.cssClass = "icon-sort-descending";
        button.command = "sort-ascending";
        button.tooltip = "Sort ascending";
        set_sort(column.id, "descending");
      }
    });

    self.grid.registerPlugin(header_buttons);
    self.grid.registerPlugin(new SlickAutoTooltips({ enableForHeaderCells: true }));

    self.grid.setSelectionModel(new SlickRowSelectionModel());
    self.grid.onSelectedRowsChanged.subscribe(function (e, selection) {
      // Don't trigger a selection event unless the selection was changed by user interaction (i.e. not outside callers or changing the sort order).
      if (self.trigger_row_selection) {
        self.data.get_indices("unsorted", selection.rows, function (unsorted_rows) {
          // Converting unsorted_rows to a regular array, because sometimes it's a typed array (Int32Array)
          self.options["row-selection"] = Array.prototype.slice.call(unsorted_rows);
          self.element.trigger("table-selection-changed", [self.options["row-selection"]]);
        });
      }
      self.trigger_row_selection = true;
    });
    self.grid.onHeaderClick.subscribe(function (e, args) {
      if (
        args.column.field != self.options.color_variable &&
        self.options.metadata["column-types"][args.column.id] != "string"
      ) {
        self.options.color_variable = args.column.field;
        self._color_variables(self.options.color_variable);
        self.element.trigger("color-selection-changed", self.options.color_variable);
      }
    });

    self._color_variables(self.options.color_variable);

    self.grid.init();

    table_helpers._set_selected_rows_no_trigger(self);
  },

  resize_canvas: function () {
    var self = this;
    self.grid.resizeCanvas();
  },

  update_data: function () {
    var self = this;
    self.data.invalidate();
    self.grid.invalidate();
    table_helpers._set_selected_rows_no_trigger(self);
  },

  _setOption: function (key, value) {
    var self = this;

    if (key == "row-selection") {
      if (!_.isEmpty(_.xor(this.options[key], value))) {
        self.options[key] = value.slice();
        table_helpers._set_selected_rows_no_trigger(self);
      }
    } else if (key == "color_variable") {
      if (self.options[key] != value) {
        self.options[key] = value;
        self._color_variables(value);
      }
    } else if (key == "color_scale") {
      if (self.options[key] != value) {
        self.options[key] = value;
        self._color_variables(self.options.color_variable);
      }
    } else if (key == "jump_to_simulation") {
      self.data.get_indices("sorted", [value], function (sorted_rows) {
        if (sorted_rows.length) {
          var rowIndex = Math.min.apply(Math, sorted_rows);
          self.grid.scrollRowToTop(rowIndex);
          // Get all the columns
          self.grid.getColumns().forEach(function (col) {
            // Flash each cell
            self.grid.flashCell(rowIndex, self.grid.getColumnIndex(col.id));
          });
        }
      });
    }
  },

  _color_variables: function (variable) {
    var self = this;

    var columns = self.grid.getColumns();
    for (var i in columns) {
      var column = columns[i];
      if (self.options.color_scale !== null && column.id == variable) {
        column.color_scale = self.options.color_scale;
        column.cssClass = column.cssClass.split(" ")[0] + " highlight";
      } else {
        column.color_scale = null;
        column.cssClass = column.cssClass.split(" ")[0];
      }
    }

    self.grid.invalidate();
  },

  _data_provider: function (parameters) {
    var self = this;

    self.api_root = parameters.api_root;
    self.mid = parameters.mid;
    self.aid = parameters.aid;
    self.metadata = parameters.metadata;
    self.sort_column = parameters.sort_column;
    self.sort_order = parameters.sort_order;
    self.inputs = parameters.inputs;
    self.outputs = parameters.outputs;
    self.analysis_columns = self.inputs.concat(self.outputs);
    self.ranked_indices = {};

    self.pages = {};
    self.pages_in_progress = {};
    self.page_size = 50;

    self.onDataLoaded = new SlickEvent();

    self.getLength = function () {
      return self.metadata["row-count"];
    };

    self.getItem = function (index) {
      var column_begin = 0;
      var column_end = self.metadata["column-count"];
      var page = Math.floor(index / self.page_size);
      var page_begin = page * self.page_size;

      if (self.pages_in_progress[page]) {
        return null;
      }

      if (!(page in self.pages)) {
        self.pages_in_progress[page] = true;
        var row_begin = page_begin;
        var row_end = (page + 1) * self.page_size;

        var sort = "";
        if (self.sort_column !== null && self.sort_order !== null) {
          var sort_column = "a" + self.sort_column;
          var sort_order = self.sort_order;
          if (sort_order == "ascending") {
            sort_order = "asc";
          } else if (sort_order == "descending") {
            sort_order = "desc";
          }
          if (self.sort_column == self.metadata["column-count"] - 1) sort_column = "index(0)";
          sort = "/order: rank(" + sort_column + ', "' + sort_order + '")';
        }

        $.ajax({
          type: "GET",
          url:
            self.api_root +
            "models/" +
            self.mid +
            "/arraysets/" +
            self.aid +
            "/data?hyperchunks=0/" +
            column_begin +
            ":" +
            (column_end - 1) +
            "|index(0)" +
            sort +
            "/" +
            row_begin +
            ":" +
            row_end,
          success: function (data) {
            self.pages[page] = [];
            for (var i = 0; i < data[0].length; i++) {
              var result = {};
              for (var j = column_begin; j != column_end; ++j) {
                result[j] = data[j][i];
              }
              self.pages[page].push(result);
            }
            self.pages_in_progress[page] = false;
            self.onDataLoaded.notify({ from: row_begin, to: row_end });
          },
          error: function (request, status, reason_phrase) {
            console.log("error", request, status, reason_phrase);
          },
        });
        return null;
      }

      return self.pages[page][index - page_begin];
    };

    self.getItemMetadata = function (index) {
      var page = Math.floor(index / self.page_size);
      if (self.pages_in_progress[page] || !(page in self.pages)) {
        return null;
      }

      var row = this.getItem(index);
      var column_end = self.analysis_columns.length;
      var cssClasses = "";
      for (var i = 0; i != column_end; i++) {
        if (row[self.analysis_columns[i]] == null) {
          cssClasses += "nullRow";
        }
      }
      if (cssClasses != "") return { cssClasses: cssClasses };
      return null;
    };

    (self.set_sort = function (column, order) {
      if (column == self.sort_column && order == self.sort_order) {
        return;
      }
      self.sort_column = column;
      self.sort_order = order;
      self.pages = {};
    }),
      (self.get_indices = function (direction, rows, callback) {
        if (rows.length == 0) {
          callback([]);
          return;
        }
        // We have no sort column or order, so just returning the same rows as were asked for since they're in the same order
        if (self.sort_column == null || self.sort_order == null) {
          callback(rows);
        } else {
          if (self.ranked_indices[self.sort_column]) {
            // we have data for this column, so figure out what to return
            var indices = self.ranked_indices[self.sort_column];
            // Reverse response indexes for descending sort order
            if (self.sort_order == "descending") {
              var plain_array = [];
              for (var i = 0; i < indices.length; i++) {
                plain_array.push(indices[i]);
              }
              indices = plain_array.reverse();
            }
            var response = [];
            for (var i = 0; i < rows.length; i++) {
              if (direction == "unsorted") {
                response.push(indices[rows[i]]);
              } else if (direction == "sorted") {
                response.push(indices.indexOf(rows[i]));
              }
            }
            callback(new Int32Array(response));
          } else {
            if (self.sort_column == self.metadata["column-count"] - 1) {
              // we are sorting by the index column, so we can just make the data we need.
              self.ranked_indices[self.sort_column] = new Int32Array(
                d3.range(self.metadata["row-count"]),
              );
              self.get_indices(direction, rows, callback);
            } else {
              // we have no data for this column, so go retrieve it and call this function again.
              var request = new XMLHttpRequest();
              request.open(
                "GET",
                self.api_root +
                  "models/" +
                  self.mid +
                  "/arraysets/" +
                  self.aid +
                  "/data?hyperchunks=0/rank(a" +
                  self.sort_column +
                  ',"asc")/...&byteorder=' +
                  (chunker.is_little_endian() ? "little" : "big"),
              );
              request.responseType = "arraybuffer";
              request.direction = direction;
              request.rows = rows;
              request.callback = callback;
              request.onload = function (e) {
                var indices = [];
                var data = new Int32Array(this.response);
                // Filtering out every other element in the reponse array, because it's full of extraneous 0 (zeros) for some reason.
                // Need to figure out why, but this is a fix for now.
                for (var i = 0; i < data.length; i = i + 2) {
                  indices.push(data[i]);
                }
                self.ranked_indices[self.sort_column] = new Int32Array(indices);
                self.get_indices(this.direction, this.rows, this.callback);
              };
              request.send();
            }
          }
        }
      });
  },

  _array_equal: function (a, b) {
    return $(a).not(b).length == 0 && $(b).not(a).length == 0;
  },
});
