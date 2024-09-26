import d3 from "d3";
import * as chunker from "js/chunker";
import { SlickEvent } from "slickgrid";

var SlickGridDataProvider = function (parameters) {
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

  self.set_sort = function (column, order) {
    if (column == self.sort_column && order == self.sort_order) {
      return;
    }
    self.sort_column = column;
    self.sort_order = order;
    self.pages = {};
  };

  self.get_indices = function (direction, rows, callback) {
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
              "/arraysets/data-table/data?hyperchunks=0/rank(a" +
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
  };
};

export { SlickGridDataProvider as default };
