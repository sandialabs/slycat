"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-parameter-image-controls", ["slycat-server-root", "slycat-dialog", "lodash", "papaparse", "react.development", "react-dom.development"], function (server_root, dialog, _, Papa, React, ReactDOM) {
  var ControlsBar = function (_React$Component) {
    _inherits(ControlsBar, _React$Component);

    function ControlsBar(props) {
      _classCallCheck(this, ControlsBar);

      var _this = _possibleConstructorReturn(this, (ControlsBar.__proto__ || Object.getPrototypeOf(ControlsBar)).call(this, props));

      _this.state = { x_variable: 1 };
      // This binding is necessary to make `this` work in the callback
      _this.set_x_variable = _this.set_x_variable.bind(_this);
      return _this;
    }

    _createClass(ControlsBar, [{
      key: "set_x_variable",
      value: function set_x_variable(key, e) {
        // That function will receive the previous state as the first argument, and the props at the time the update is applied as the second argument.
        // This format is favored because this.props and this.state may be updated asynchronously, you should not rely on their values for calculating the next state.
        this.setState(function (prevState, props) {
          return {
            x_variable: key
          };
        });
      }
    }, {
      key: "render",
      value: function render() {
        return React.createElement(
          ControlsGroup,
          { id: "scatterplot-controls" },
          React.createElement(ControlsDropdown, { id: "x-axis-dropdown", title: "Change X Axis Variable", items: this.props.x_axis_dropdown, set_x_variable: this.set_x_variable, x_variable: this.state.x_variable })
        );
      }
    }]);

    return ControlsBar;
  }(React.Component);

  var ControlsGroup = function (_React$Component2) {
    _inherits(ControlsGroup, _React$Component2);

    function ControlsGroup() {
      _classCallCheck(this, ControlsGroup);

      return _possibleConstructorReturn(this, (ControlsGroup.__proto__ || Object.getPrototypeOf(ControlsGroup)).apply(this, arguments));
    }

    _createClass(ControlsGroup, [{
      key: "render",
      value: function render() {
        return React.createElement(
          "div",
          { id: this.props.id, className: "btn-group btn-group-xs" },
          this.props.children
        );
      }
    }]);

    return ControlsGroup;
  }(React.Component);

  var ControlsDropdown = function (_React$Component3) {
    _inherits(ControlsDropdown, _React$Component3);

    function ControlsDropdown(props) {
      _classCallCheck(this, ControlsDropdown);

      return _possibleConstructorReturn(this, (ControlsDropdown.__proto__ || Object.getPrototypeOf(ControlsDropdown)).call(this, props));
    }

    _createClass(ControlsDropdown, [{
      key: "render",
      value: function render() {
        var _this4 = this;

        var optionItems = this.props.items.map(function (item) {
          return React.createElement(
            "li",
            { role: "presentation", key: item.key, className: item.key == _this4.props.x_variable ? 'active' : '' },
            React.createElement(
              "a",
              { role: "menuitem", tabIndex: "-1", onClick: function onClick(e) {
                  return _this4.props.set_x_variable(item.key, e);
                } },
              item.name
            )
          );
        });
        return React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "button",
            { className: "btn btn-default dropdown-toggle", type: "button", id: this.props.id, "data-toggle": "dropdown", "aria-expanded": "true", title: this.props.title },
            "X Axis\xA0",
            React.createElement("span", { className: "caret" })
          ),
          React.createElement(
            "ul",
            { id: "x-axis-switcher", className: "dropdown-menu", role: "menu", "aria-labelledby": "x-axis-dropdown" },
            optionItems
          )
        );
      }
    }]);

    return ControlsDropdown;
  }(React.Component);

  $.widget("parameter_image.controls", {
    options: {
      mid: null,
      model_name: null,
      aid: null,
      metadata: null,
      // cluster_index : null,
      "x-variable": null,
      "y-variable": null,
      "image-variable": null,
      "color-variable": null,
      "auto-scale": true,
      // clusters : [],
      x_variables: [],
      y_variables: [],
      image_variables: [],
      color_variables: [],
      rating_variables: [],
      category_variables: [],
      selection: [],
      hidden_simulations: [],
      indices: [],
      disable_hide_show: false,
      open_images: [],
      "video-sync": false,
      "video-sync-time": 0
    },

    _create: function _create() {
      var self = this;

      var x_axis_dropdown_items = [];
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = this.options.x_variables[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var x_variable = _step.value;

          x_axis_dropdown_items.push({
            key: x_variable,
            name: self.options.metadata['column-names'][x_variable]
          });
          // $("<li role='presentation'>")
          //   .toggleClass("active", self.options["x-variable"] == self.options.x_variables[i])
          //   .attr("data-xvariable", this.options.x_variables[i])
          //   .appendTo(self.x_items)
          //   .append(
          //     $('<a role="menuitem" tabindex="-1">')
          //       .html(this.options.metadata['column-names'][this.options.x_variables[i]])
          //       .click(function()
          //       {
          //         var menu_item = $(this).parent();
          //         if(menu_item.hasClass("active"))
          //           return false;

          //         self.x_items.find("li").removeClass("active");
          //         menu_item.addClass("active");

          //         self.element.trigger("x-selection-changed", menu_item.attr("data-xvariable"));
          //       })
          //   )
          //   ;
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      var controls_bar = React.createElement(ControlsBar, { x_axis_dropdown: x_axis_dropdown_items });
      ReactDOM.render(controls_bar, document.getElementById('react-controls'));

      var scatterplot_controls = $("#scatterplot-controls", this.element);
      var selection_controls = $("#selection-controls", this.element);
      var video_controls = $("#video-controls", this.element);
      this.video_controls = video_controls;
      var playback_controls = $("#playback-controls", this.element);
      this.playback_controls = playback_controls;

      this.x_control = $('<div class="btn-group btn-group-xs"></div>').appendTo(scatterplot_controls);
      this.x_button = $('\
      <button class="btn btn-default dropdown-toggle" type="button" id="x-axis-dropdown" data-toggle="dropdown" aria-expanded="true" title="Change X Axis Variable"> \
        X Axis \
        <span class="caret"></span> \
      </button> \
      ').appendTo(self.x_control);
      this.x_items = $('<ul id="x-axis-switcher" class="dropdown-menu" role="menu" aria-labelledby="x-axis-dropdown">').appendTo(self.x_control);

      this.y_control = $('<div class="btn-group btn-group-xs"></div>').appendTo(scatterplot_controls);
      this.y_button = $('\
      <button class="btn btn-default dropdown-toggle" type="button" id="y-axis-dropdown" data-toggle="dropdown" aria-expanded="true" title="Change Y Axis Variable"> \
        Y Axis \
        <span class="caret"></span> \
      </button> \
      ').appendTo(self.y_control);
      this.y_items = $('<ul id="y-axis-switcher" class="dropdown-menu" role="menu" aria-labelledby="y-axis-dropdown">').appendTo(self.y_control);

      this.color_control = $('<div class="btn-group btn-group-xs"></div>').appendTo(scatterplot_controls);
      this.color_button = $('\
      <button class="btn btn-default dropdown-toggle" type="button" id="color-dropdown" data-toggle="dropdown" aria-expanded="true" title="Change Point Color"> \
        Point Color \
        <span class="caret"></span> \
      </button> \
      ').appendTo(self.color_control);

      if (this.options.image_variables != null && this.options.image_variables.length > 0) {
        this.image_control = $('<div class="btn-group btn-group-xs"></div>').appendTo(scatterplot_controls);
        this.image_button = $('\
        <button class="btn btn-default dropdown-toggle" type="button" id="image-dropdown" data-toggle="dropdown" aria-expanded="true" title="Change Media Set Variable"> \
          Media Set \
          <span class="caret"></span> \
        </button> \
        ').appendTo(self.image_control);
        this.image_items = $('<ul id="image-switcher" class="dropdown-menu" role="menu" aria-labelledby="image-dropdown">').appendTo(self.image_control);
      }

      this.color_items = $('<ul id="y-axis-switcher" class="dropdown-menu" role="menu" aria-labelledby="color-dropdown">').appendTo(self.color_control);

      this.auto_scale_button = $("\
      <button class='btn btn-default' data-toggle='button' title='Auto Scale'> \
        <span class='fa fa-external-link' aria-hidden='true'></span> \
      </button> \
      ").click(function () {
        self.element.trigger("auto-scale", !$(this).hasClass('active'));
      }).appendTo(selection_controls);

      this.selection_control = $('<div class="btn-group btn-group-xs"></div>').appendTo(selection_controls);
      this.selection_button = $('\
      <button class="btn btn-default dropdown-toggle" type="button" id="selection-dropdown" data-toggle="dropdown" aria-expanded="true" title="Perform Action On Selection"> \
        Selection Action \
        <span class="caret"></span> \
      </button> \
      ').appendTo(self.selection_control);
      this.selection_items = $('<ul id="selection-switcher" class="dropdown-menu" role="menu" aria-labelledby="selection-dropdown">').appendTo(self.selection_control);

      this.show_all_button = $('<button type="button" class="btn btn-default">Show All</button>').click(function () {
        self.element.trigger("show-all");
      }).appendTo(selection_controls);

      this.close_all_button = $('<button type="button" class="btn btn-default">Close All Pins</button>').click(function () {
        self.element.trigger("close-all");
      }).appendTo(selection_controls);

      this.csv_button = $("\
      <button class='btn btn-default' title='Download Data Table'> \
        <span class='fa fa-download' aria-hidden='true'></span> \
      </button> \
      ").click(function () {
        if (self.options.selection.length == 0 && self.options.hidden_simulations.length == 0) {
          self._write_data_table();
        } else {
          openCSVSaveChoiceDialog();
        }
      }).appendTo(selection_controls);

      this.video_sync_button_wrapper = $("<span class='input-group-btn'></span>").appendTo(video_controls);

      this.video_sync_button = $("\
        <button class='btn btn-default btn-xs' data-toggle='button'> \
          <span class='fa fa-video-camera' aria-hidden='true'></span> \
        </button> \
      ").click(function () {
        self.options["video-sync"] = !$(this).hasClass('active');
        self._respond_open_images_changed();
        self.element.trigger("video-sync", !$(this).hasClass('active'));
        this.title = self.options["video-sync"] ? 'Unsync videos' : 'Sync videos';
      }).attr('title', self.options["video-sync"] ? 'Unsync videos' : 'Sync videos').appendTo(self.video_sync_button_wrapper);

      this.video_sync_time = $("\
      <input type='text' class='form-control input-xs video-sync-time' placeholder='Time'> \
      ").focusout(function () {
        handleVideoSyncTimeChange(this);
      }).keypress(function (e) {
        if (e.which == 13) {
          handleVideoSyncTimeChange(this);
        }
      }).appendTo(video_controls);

      this.jump_to_start_button = $("\
      <button class='btn btn-default' title='Jump to beginning'> \
        <span class='fa fa-fast-backward' aria-hidden='true'></span> \
      </button> \
      ").click(function () {
        self.element.trigger("jump-to-start");
      }).appendTo(playback_controls);

      this.frame_back_button = $("\
      <button class='btn btn-default' title='Skip one frame back'> \
        <span class='fa fa-backward' aria-hidden='true'></span> \
      </button> \
      ").click(function () {
        self.element.trigger("frame-back");
      }).appendTo(playback_controls);

      this.play_button = $("\
      <button class='btn btn-default play-button' title='Play'> \
        <span class='fa fa-play' aria-hidden='true'></span> \
      </button> \
      ").click(function () {
        self.element.trigger("play");
        $(this).hide();
        self.pause_button.show();
      }).appendTo(playback_controls);

      this.pause_button = $("\
      <button class='btn btn-default pause-button' title='Pause'> \
        <span class='fa fa-pause' aria-hidden='true'></span> \
      </button> \
      ").click(function () {
        self.element.trigger("pause");
        $(this).hide();
        self.play_button.show();
      }).hide().appendTo(playback_controls);

      this.frame_forward = $("\
      <button class='btn btn-default' title='Skip one frame forward'> \
        <span class='fa fa-forward' aria-hidden='true'></span> \
      </button> \
      ").click(function () {
        self.element.trigger("frame-forward");
      }).appendTo(playback_controls);

      this.jump_to_end_button = $("\
      <button class='btn btn-default' title='Jump to end'> \
        <span class='fa fa-fast-forward' aria-hidden='true'></span> \
      </button> \
      ").click(function () {
        self.element.trigger("jump-to-end");
      }).appendTo(playback_controls);

      function handleVideoSyncTimeChange(element) {
        var val = parseFloat($(element).val());
        if (isNaN(val)) {
          val = 0;
        }
        $(element).val(val);
        self.options["video-sync-time"] = val;
        self.element.trigger("video-sync-time", val);
      }

      function openCSVSaveChoiceDialog() {
        var txt = "";
        var buttons_save = [{ className: "btn-default", label: "Cancel" }, { className: "btn-primary", label: "Save Entire Table", icon_class: "fa fa-table" }];

        if (self.options.selection.length > 0) {
          txt += "You have " + self.options.selection.length + " rows selected. ";
          buttons_save.splice(buttons_save.length - 1, 0, { className: "btn-primary", label: "Save Selected", icon_class: "fa fa-check" });
        }
        if (self.options.hidden_simulations.length > 0) {
          var visibleRows = self.options.metadata['row-count'] - self.options.hidden_simulations.length;
          txt += "You have " + visibleRows + " rows visible. ";
          buttons_save.splice(buttons_save.length - 1, 0, { className: "btn-primary", label: "Save Visible", icon_class: "fa fa-eye" });
        }

        txt += "What would you like to do?";

        dialog.dialog({
          title: "Download Choices",
          message: txt,
          buttons: buttons_save,
          callback: function callback(button) {
            if (button.label == "Save Entire Table") self._write_data_table();else if (button.label == "Save Selected") self._write_data_table(self.options.selection);else if (button.label == "Save Visible") self._write_data_table(self._filterIndices());
          }
        });
      }

      // if(self.options.clusters.length > 0)
      // {
      //   self._set_clusters();
      // }
      self._set_x_variables();
      self._set_y_variables();
      self._set_image_variables();
      self._set_color_variables();
      self._set_auto_scale();
      self._set_selection_control();
      self._set_show_all();
      self._set_video_sync();
      self._set_video_sync_time();
      self._respond_open_images_changed();
    },

    _write_data_table: function _write_data_table(selectionList) {
      var self = this;
      $.ajax({
        type: "POST",
        url: server_root + "models/" + self.options.mid + "/arraysets/" + self.options.aid + "/data",
        data: JSON.stringify({ "hyperchunks": "0/.../..." }),
        contentType: "application/json",
        success: function success(result) {
          self._write_csv(self._convert_to_csv(result, selectionList), self.options.model_name + "_data_table.csv");
        },
        error: function error(request, status, reason_phrase) {
          window.alert("Error retrieving data table: " + reason_phrase);
        }
      });
    },

    _write_csv: function _write_csv(csvData, defaultFilename) {
      var blob = new Blob([csvData], {
        type: "application/csv;charset=utf-8;"
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

    _convert_to_csv: function _convert_to_csv(array, sl) {
      // Note that array.data is column-major:  array.data[0][*] is the first column
      var self = this;

      // Converting data array from column major to row major
      var rowMajorData = _.zip.apply(_, _toConsumableArray(array));

      // If we have a selection list, remove everything but those elements from the data array
      if (sl != undefined && sl.length > 0) {
        // sl is in the order the user selected the rows, so sort it.
        // We want to end up with rows in the same order as in the original data.
        sl.sort();
        // Only keep elements at the indexes specified in sl
        rowMajorData = _.at(rowMajorData, sl);
      }

      // Creating an array of column headers by removing the last one, which is the Index that does not exist in the data
      var headers = self.options.metadata["column-names"].slice(0, -1);
      // Adding headers as first element in array of data rows
      rowMajorData.unshift(headers);

      // Creating CSV from data array
      var csv = Papa.unparse(rowMajorData);
      return csv;
    },

    _set_x_variables: function _set_x_variables() {
      var self = this;

      this.x_items.empty();
      for (var i = 0; i < this.options.x_variables.length; i++) {
        $("<li role='presentation'>").toggleClass("active", self.options["x-variable"] == self.options.x_variables[i]).attr("data-xvariable", this.options.x_variables[i]).appendTo(self.x_items).append($('<a role="menuitem" tabindex="-1">').html(this.options.metadata['column-names'][this.options.x_variables[i]]).click(function () {
          var menu_item = $(this).parent();
          if (menu_item.hasClass("active")) return false;

          self.x_items.find("li").removeClass("active");
          menu_item.addClass("active");

          self.element.trigger("x-selection-changed", menu_item.attr("data-xvariable"));
        }));
      }
    },

    _set_y_variables: function _set_y_variables() {
      var self = this;

      this.y_items.empty();
      for (var i = 0; i < this.options.y_variables.length; i++) {
        $("<li role='presentation'>").toggleClass("active", self.options["y-variable"] == self.options.y_variables[i]).attr("data-yvariable", this.options.y_variables[i]).appendTo(self.y_items).append($('<a role="menuitem" tabindex="-1">').html(this.options.metadata['column-names'][this.options.y_variables[i]]).click(function () {
          var menu_item = $(this).parent();
          if (menu_item.hasClass("active")) return false;

          self.y_items.find("li").removeClass("active");
          menu_item.addClass("active");

          self.element.trigger("y-selection-changed", menu_item.attr("data-yvariable"));
        }));
      }
    },

    _set_image_variables: function _set_image_variables() {
      var self = this;
      if (this.options.image_variables != null && this.options.image_variables.length > 0) {
        this.image_items.empty();
        appendImageVariable(-1, 'None');
        for (var i = 0; i < this.options.image_variables.length; i++) {
          appendImageVariable(self.options.image_variables[i], self.options.metadata['column-names'][self.options.image_variables[i]]);
        }
      }

      function appendImageVariable(index, label) {
        $("<li role='presentation'>").toggleClass("active", self.options["image-variable"] == index).attr("data-imagevariable", index).appendTo(self.image_items).append($('<a role="menuitem" tabindex="-1">').html(label).click(function () {
          var menu_item = $(this).parent();
          if (menu_item.hasClass("active")) return false;

          self.options["image-variable"] = menu_item.attr("data-imagevariable");

          self.image_items.find("li").removeClass("active");
          menu_item.addClass("active");

          self.pin_item.toggleClass("disabled", self.options["image-variable"] == -1 || self.options["image-variable"] == null);

          self.element.trigger("images-selection-changed", menu_item.attr("data-imagevariable"));
        }));
      }
    },

    _set_color_variables: function _set_color_variables() {
      var self = this;
      this.color_items.empty();
      for (var i = 0; i < this.options.color_variables.length; i++) {
        $("<li role='presentation'>").toggleClass("active", self.options["color-variable"] == self.options.color_variables[i]).attr("data-colorvariable", this.options.color_variables[i]).appendTo(self.color_items).append($('<a role="menuitem" tabindex="-1">').html(this.options.metadata['column-names'][this.options.color_variables[i]]).click(function () {
          var menu_item = $(this).parent();
          if (menu_item.hasClass("active")) return false;

          self.color_items.find("li").removeClass("active");
          menu_item.addClass("active");

          self.element.trigger("color-selection-changed", menu_item.attr("data-colorvariable"));
        }));
      }
    },

    _set_auto_scale: function _set_auto_scale() {
      var self = this;
      this.auto_scale_button.toggleClass("active", self.options["auto-scale"]);
      this.auto_scale_button.attr("aria-pressed", self.options["auto-scale"]);
    },

    _set_video_sync: function _set_video_sync() {
      var self = this;
      this.video_sync_button.toggleClass("active", self.options["video-sync"]);
      this.video_sync_button.attr("aria-pressed", self.options["video-sync"]);
    },

    _set_video_sync_time: function _set_video_sync_time() {
      var self = this;
      this.video_sync_time.val(self.options["video-sync-time"]);
    },

    _set_selection_control: function _set_selection_control() {
      var self = this;
      this.selection_items.empty();
      // Add options for ratings
      for (var i = 0; i < this.options.rating_variables.length; i++) {
        var var_label = this.options.metadata['column-names'][this.options.rating_variables[i]];
        $('<li role="presentation" class="dropdown-header"></li>').text(this.options.metadata['column-names'][this.options.rating_variables[i]]).appendTo(self.selection_items);
        $("<li role='presentation'>").appendTo(self.selection_items).append($('<a role="menuitem" tabindex="-1">').html("Set").attr("data-value", this.options.rating_variables[i]).attr("data-label", "set").attr("data-variable", var_label).click(function () {
          var menu_item = $(this).parent();
          if (menu_item.hasClass("disabled")) return false;

          openSetValueDialog(this.dataset.variable, this.dataset.value);
        }));
        // Disabling clear functionality for ratings since it causes problems with nulls
        // $("<li role='presentation'>")
        //   .appendTo(self.selection_items)
        //   .append(
        //     $('<a role="menuitem" tabindex="-1">')
        //       .html("Clear")
        //       .attr("data-value", this.options.rating_variables[i])
        //       .attr("data-label", "clear")
        //       .click(function()
        //       {
        //         var menu_item = $(this).parent();
        //         if(menu_item.hasClass("disabled"))
        //           return false;

        //         openClearValueDialog(this.dataset.variable, this.dataset.value);
        //       })
        //   )
        //   ;
      }
      // Finish with global actions
      $('<li role="presentation" class="dropdown-header"></li>').text("Scatterplot Points").appendTo(self.selection_items);
      self.hide_item = $("<li role='presentation'>").appendTo(self.selection_items).append($('<a role="menuitem" tabindex="-1">').html("Hide").attr("data-value", "hide").click(function () {
        var menu_item = $(this).parent();
        if (menu_item.hasClass("disabled")) return false;

        self.element.trigger("hide-selection", self.options.selection);
      }));
      self.hide_unselected_item = $("<li role='presentation'>").appendTo(self.selection_items).append($('<a role="menuitem" tabindex="-1">').html("Hide Unselected").attr("data-value", "hide_unselected").click(function () {
        var menu_item = $(this).parent();
        if (menu_item.hasClass("disabled")) return false;

        self.element.trigger("hide-unselected", self.options.selection);
      }));
      self.show_item = $("<li role='presentation'>").appendTo(self.selection_items).append($('<a role="menuitem" tabindex="-1">').html("Show").attr("data-value", "show").click(function () {
        var menu_item = $(this).parent();
        if (menu_item.hasClass("disabled")) return false;

        self.element.trigger("show-selection", self.options.selection);
      }));
      self.pin_item = $("<li role='presentation'>").appendTo(self.selection_items).toggleClass("disabled", self.options["image-variable"] == -1 || self.options["image-variable"] == null).append($('<a role="menuitem" tabindex="-1">').html("Pin").attr("data-value", "pin").click(function () {
        var menu_item = $(this).parent();
        if (menu_item.hasClass("disabled")) return false;

        self.element.trigger("pin-selection", self.options.selection);
      }));

      // Set state
      self._set_selection();

      function openSetValueDialog(variable, variableIndex, value, alert) {
        dialog.prompt({
          title: "Set Values",
          message: "Set values for " + variable + ":",
          value: value,
          alert: alert,
          buttons: [{ className: "btn-default", label: "Cancel" }, { className: "btn-primary", label: "Apply" }],
          callback: function callback(button, value) {
            if (button.label == "Apply") {
              var value = value().trim();
              var numeric = self.options.metadata["column-types"][variableIndex] != "string";
              var valueValid = value.length > 0;
              if (valueValid && numeric && isNaN(Number(value))) {
                valueValid = false;
              }
              if (valueValid) {
                self.element.trigger("set-value", {
                  selection: self.options.selection,
                  variable: variableIndex,
                  value: numeric ? value : '"' + value + '"'
                });
              } else {
                var alert = "Please enter a value.";
                if (numeric) alert = "Please enter a numeric value.";
                openSetValueDialog(variable, variableIndex, value, alert);
              }
            }
          }
        });
      }
      function openClearValueDialog(variable, variableIndex) {
        dialog.confirm({
          title: "Clear Values",
          message: "Clear values for " + variable + "?",
          ok: function ok() {
            self.element.trigger("set-value", { selection: self.options.selection, variable: variableIndex, value: NaN });
          }
        });
      }
    },

    _set_selected_x: function _set_selected_x() {
      var self = this;
      self.x_items.find("li").removeClass("active");
      self.x_items.find('li[data-xvariable="' + self.options["x-variable"] + '"]').addClass("active");
    },

    _set_selected_y: function _set_selected_y() {
      var self = this;
      self.y_items.find("li").removeClass("active");
      self.y_items.find('li[data-yvariable="' + self.options["y-variable"] + '"]').addClass("active");
    },

    _set_selected_image: function _set_selected_image() {
      var self = this;
      if (self.options["image-variable"] != null && self.options.image_variables.length > 0) {
        self.image_items.find("li").removeClass("active");
        self.image_items.find('li[data-imagevariable="' + self.options["image-variable"] + '"]').addClass("active");
      }
      self.pin_item.toggleClass("disabled", this.options["image-variable"] == -1 || this.options["image-variable"] == null);
    },

    _set_selected_color: function _set_selected_color() {
      var self = this;
      self.color_items.find("li").removeClass("active");
      self.color_items.find('li[data-colorvariable="' + self.options["color-variable"] + '"]').addClass("active");
    },

    _set_selection: function _set_selection() {
      var self = this;
      self.selection_button.toggleClass("disabled", this.options.selection.length == 0);
    },

    _set_show_all: function _set_show_all() {
      var self = this,
          noneHidden = this.options.hidden_simulations.length == 0,
          titleText = 'Show All Hidden Scatterplot Points';
      if (noneHidden || self.options.disable_hide_show) {
        titleText = 'There are currently no hidden scatterplot points to show.';
      }
      this.show_all_button.prop("disabled", noneHidden || self.options.disable_hide_show);
      this.show_all_button.attr("title", titleText);
    },

    _respond_open_images_changed: function _respond_open_images_changed() {
      var self = this;
      var frame;
      var any_video_open = false;
      var any_video_playing = false;
      var current_frame_video = false;
      var current_frame_video_playing = false;
      for (var i = 0; i < self.options.open_images.length; i++) {
        frame = self.options.open_images[i];
        if (frame.video) {
          any_video_open = true;
          if (frame.current_frame) {
            current_frame_video = true;
            if (frame.playing) {
              current_frame_video_playing = true;
              any_video_playing = true;
              break;
            }
          }
          if (frame.playing) {
            any_video_playing = true;
          }
        }
        // No need to keep searching if we found a video and the current frame is also a video
        if (any_video_open && current_frame_video && any_video_playing && current_frame_video_playing) {
          break;
        }
      }
      // console.log("any_video_open: " + any_video_open + ", any_video_playing: " + any_video_playing + ", current_frame_video: " + current_frame_video + ", current_frame_video_playing: " + current_frame_video_playing);
      // Hide / show video controls based on whether any videos are open
      this.video_controls.add(this.playback_controls).toggle(any_video_open);
      // Disable playback controls when the current frame is no a video and sync videos is not toggled
      $('button', this.playback_controls).prop("disabled", !(self.options["video-sync"] || current_frame_video));
      // Disable close all button when there are no open frames
      this.close_all_button.prop("disabled", self.options.open_images.length == 0);
      // Enable play or pause based on what's playing
      if (self.options["video-sync"] && any_video_playing || !self.options["video-sync"] && current_frame_video_playing) {
        self.pause_button.show();
        self.play_button.hide();
      } else {
        self.pause_button.hide();
        self.play_button.show();
      }
    },

    _set_hide_show_selection_status: function _set_hide_show_selection_status() {
      var self = this;
      self.hide_item.toggleClass("disabled", self.options.disable_hide_show);
      self.hide_unselected_item.toggleClass("disabled", self.options.disable_hide_show);
      self.show_item.toggleClass("disabled", self.options.disable_hide_show);
    },

    // Remove hidden_simulations from indices
    _filterIndices: function _filterIndices() {
      var self = this;
      var indices = self.options.indices;
      var hidden_simulations = self.options.hidden_simulations;
      var filtered_indices = self._cloneArrayBuffer(indices);
      var length = indices.length;

      // Remove hidden simulations and NaNs and empty strings
      for (var i = length - 1; i >= 0; i--) {
        var hidden = $.inArray(indices[i], hidden_simulations) > -1;
        if (hidden) {
          filtered_indices.splice(i, 1);
        }
      }

      return filtered_indices;
    },

    // Clones an ArrayBuffer or Array
    _cloneArrayBuffer: function _cloneArrayBuffer(source) {
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
      for (var i = 0; i < source.length; i++) {
        clone.push(source[i]);
      }
      return clone;
    },

    _setOption: function _setOption(key, value) {
      var self = this;

      //console.log("sparameter_image.variableswitcher._setOption()", key, value);
      this.options[key] = value;

      if (key == "x-variable") {
        self._set_selected_x();
      } else if (key == "y-variable") {
        self._set_selected_y();
      } else if (key == "image-variable") {
        self._set_selected_image();
      } else if (key == "color-variable") {
        self._set_selected_color();
      } else if (key == "image_variables") {
        self._set_image_variables();
      } else if (key == 'x_variables') {
        self._set_x_variables();
      } else if (key == 'y_variables') {
        self._set_y_variables();
      } else if (key == 'color_variables') {
        self._set_color_variables();
      } else if (key == 'selection') {
        self._set_selection();
      } else if (key == 'hidden_simulations') {
        self._set_show_all();
      } else if (key == 'open_images') {
        self._respond_open_images_changed();
      } else if (key == 'disable_hide_show') {
        self._set_show_all();
        self._set_hide_show_selection_status();
      } else if (key == 'video-sync-time') {
        self._set_video_sync_time();
      }
    }
  });
});
