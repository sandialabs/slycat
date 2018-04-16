"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

define("slycat-parameter-image-controls", ["slycat-server-root", "slycat-dialog", "lodash", "papaparse", "react.development", "react-dom.development"], function (server_root, dialog, _, Papa, React, ReactDOM) {
  var ControlsBar = function (_React$Component) {
    _inherits(ControlsBar, _React$Component);

    function ControlsBar(props) {
      _classCallCheck(this, ControlsBar);

      var _this = _possibleConstructorReturn(this, (ControlsBar.__proto__ || Object.getPrototypeOf(ControlsBar)).call(this, props));

      _this.state = {
        auto_scale: _this.props.auto_scale,
        hidden_simulations: _this.props.hidden_simulations,
        disable_hide_show: _this.props.disable_hide_show,
        open_images: _this.props.open_images,
        selection: _this.props.selection,
        video_sync: _this.props.video_sync,
        video_sync_time: _this.props.video_sync_time,
        video_sync_time_value: _this.props.video_sync_time
      };
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = _this.props.dropdowns[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var dropdown = _step.value;

          _this.state[dropdown.state_label] = dropdown.selected;
        }
        // This binding is necessary to make `this` work in the callback
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

      _this.set_selected = _this.set_selected.bind(_this);
      _this.set_auto_scale = _this.set_auto_scale.bind(_this);
      _this.set_video_sync = _this.set_video_sync.bind(_this);
      _this.set_video_sync_time = _this.set_video_sync_time.bind(_this);
      _this.set_video_sync_time_value = _this.set_video_sync_time_value.bind(_this);
      _this.trigger_show_all = _this.trigger_show_all.bind(_this);
      _this.trigger_close_all = _this.trigger_close_all.bind(_this);
      _this.trigger_hide_selection = _this.trigger_hide_selection.bind(_this);
      _this.trigger_hide_unselected = _this.trigger_hide_unselected.bind(_this);
      _this.trigger_show_selection = _this.trigger_show_selection.bind(_this);
      _this.trigger_pin_selection = _this.trigger_pin_selection.bind(_this);
      _this.trigger_jump_to_start = _this.trigger_jump_to_start.bind(_this);
      _this.trigger_frame_back = _this.trigger_frame_back.bind(_this);
      _this.trigger_play = _this.trigger_play.bind(_this);
      _this.trigger_pause = _this.trigger_pause.bind(_this);
      _this.trigger_frame_forward = _this.trigger_frame_forward.bind(_this);
      _this.trigger_jump_to_end = _this.trigger_jump_to_end.bind(_this);
      return _this;
    }

    _createClass(ControlsBar, [{
      key: "set_selected",
      value: function set_selected(state_label, key, trigger, e) {
        // Do nothing if the state hasn't changed (e.g., user clicked on currently selected variable)
        if (key == this.state[state_label]) return;
        // That function will receive the previous state as the first argument, and the props at the time the update is applied as the second argument.
        // This format is favored because this.props and this.state may be updated asynchronously, you should not rely on their values for calculating the next state.
        var obj = {};
        obj[state_label] = key;
        this.setState(function (prevState, props) {
          return obj;
        });
        // This is the legacy way of letting the rest of non-React components that the state changed. Remove once we are converted to React.
        this.props.element.trigger(trigger, key);
      }
    }, {
      key: "set_auto_scale",
      value: function set_auto_scale(e) {
        var _this2 = this;

        this.setState(function (prevState, props) {
          var new_auto_scale = !prevState.auto_scale;
          _this2.props.element.trigger("auto-scale", new_auto_scale);
          return { auto_scale: new_auto_scale };
        });
      }
    }, {
      key: "set_video_sync",
      value: function set_video_sync(e) {
        var _this3 = this;

        this.setState(function (prevState, props) {
          var new_video_sync = !prevState.video_sync;
          _this3.props.element.trigger("video-sync", new_video_sync);
          return { video_sync: new_video_sync };
        });
      }
    }, {
      key: "set_video_sync_time",
      value: function set_video_sync_time(value) {
        var _this4 = this;

        var new_video_sync_time = value;
        this.setState(function (prevState, props) {
          _this4.props.element.trigger("video-sync-time", value);
          // Setting both video_sync_time, which tracks the validated video_sync_time, and 
          // video_sync_time_value, which tracks the value of the input field and can contain invalidated data (letters, negatives, etc.)
          return {
            video_sync_time: value,
            video_sync_time_value: value
          };
        });
      }
    }, {
      key: "set_video_sync_time_value",
      value: function set_video_sync_time_value(e) {
        var new_video_sync_time = e.target.value;
        this.setState(function (prevState, props) {
          return { video_sync_time_value: new_video_sync_time };
        });
      }
    }, {
      key: "trigger_show_all",
      value: function trigger_show_all(e) {
        this.props.element.trigger("show-all");
      }
    }, {
      key: "trigger_close_all",
      value: function trigger_close_all(e) {
        this.props.element.trigger("close-all");
      }
    }, {
      key: "trigger_hide_selection",
      value: function trigger_hide_selection(e) {
        if (!this.state.disable_hide_show) {
          this.props.element.trigger("hide-selection", this.state.selection);
        }
        // The to prevent the drop-down from closing when clicking on a disabled item
        // Unfortunately none of these work to stop the drop-down from closing. Looks like bootstrap's event is fired before this one.
        // else {
        //   e.nativeEvent.stopImmediatePropagation();
        //   e.preventDefault();
        //   e.stopPropagation();
        //   return false;
        // }
      }
    }, {
      key: "trigger_hide_unselected",
      value: function trigger_hide_unselected(e) {
        if (!this.state.disable_hide_show) {
          this.props.element.trigger("hide-unselected", this.state.selection);
        }
      }
    }, {
      key: "trigger_show_selection",
      value: function trigger_show_selection(e) {
        if (!this.state.disable_hide_show) {
          this.props.element.trigger("show-selection", this.state.selection);
        }
      }
    }, {
      key: "trigger_pin_selection",
      value: function trigger_pin_selection(e) {
        if (!this.state.disable_hide_show) {
          this.props.element.trigger("pin-selection", this.state.selection);
        }
      }
    }, {
      key: "trigger_jump_to_start",
      value: function trigger_jump_to_start(e) {
        this.props.element.trigger("jump-to-start");
      }
    }, {
      key: "trigger_frame_back",
      value: function trigger_frame_back(e) {
        this.props.element.trigger("frame-back");
      }
    }, {
      key: "trigger_play",
      value: function trigger_play(e) {
        this.props.element.trigger("play");
      }
    }, {
      key: "trigger_pause",
      value: function trigger_pause(e) {
        this.props.element.trigger("pause");
      }
    }, {
      key: "trigger_frame_forward",
      value: function trigger_frame_forward(e) {
        this.props.element.trigger("frame-forward");
      }
    }, {
      key: "trigger_jump_to_end",
      value: function trigger_jump_to_end(e) {
        this.props.element.trigger("jump-to-end");
      }
    }, {
      key: "render",
      value: function render() {
        var _this5 = this;

        // Disable show all button when there are no hidden simulations or when the disable_hide_show functionality flag is on (set by filters)
        var show_all_disabled = this.state.hidden_simulations.length == 0 || this.state.disable_hide_show;
        var show_all_title = show_all_disabled ? 'There are currently no hidden scatterplot points to show.' : 'Show All Hidden Scatterplot Points';
        // Disable close all button when there are no open frames
        var close_all_disabled = this.state.open_images.length == 0;
        var disable_pin = !(this.state.media_variable && this.state.media_variable >= 0);
        var hide_pin = !(this.props.media_variables.length > 0);
        var dropdowns = this.props.dropdowns.map(function (dropdown) {
          if (dropdown.items.length > 1) {
            return React.createElement(ControlsDropdown, { key: dropdown.id, id: dropdown.id, label: dropdown.label, title: dropdown.title,
              state_label: dropdown.state_label, trigger: dropdown.trigger, items: dropdown.items,
              selected: _this5.state[dropdown.state_label], set_selected: _this5.set_selected });
          } else {
            return false;
          }
        });

        // Video and playback controls
        var any_video_open = false;
        var any_video_playing = false;
        var current_frame_video = false;
        var current_frame_video_playing = false;
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = this.state.open_images[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var open_media = _step2.value;

            if (open_media.video) {
              any_video_open = true;
              if (open_media.current_frame) {
                current_frame_video = true;
                if (open_media.playing) {
                  current_frame_video_playing = true;
                  any_video_playing = true;
                  break;
                }
              }
              if (open_media.playing) {
                any_video_playing = true;
              }
            }
            // No need to keep searching if we found a video and the current frame is also a video
            if (any_video_open && current_frame_video && any_video_playing && current_frame_video_playing) {
              break;
            }
          }
          // Disable playback controls when the current frame is not a video and sync videos is not toggled
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        var disabled_playback = !(this.state.video_sync || current_frame_video);
        // Track if any video is playing when sync is on or if the current video is playing if sync is off
        // This is used to decide if the play or the pause button is visible in the playback controls
        var playing = this.state.video_sync && any_video_playing || !this.state.video_sync && current_frame_video_playing;

        return React.createElement(
          React.Fragment,
          null,
          React.createElement(
            ControlsGroup,
            { id: "scatterplot-controls" },
            dropdowns
          ),
          React.createElement(
            ControlsGroup,
            { id: "selection-controls" },
            React.createElement(ControlsButtonToggle, { title: "Auto Scale", icon: "fa-external-link", active: this.state.auto_scale, set_active_state: this.set_auto_scale }),
            React.createElement(ControlsSelection, { trigger_hide_selection: this.trigger_hide_selection, trigger_hide_unselected: this.trigger_hide_unselected,
              trigger_show_selection: this.trigger_show_selection, trigger_pin_selection: this.trigger_pin_selection,
              disable_hide_show: this.state.disable_hide_show, disable_pin: disable_pin, hide_pin: hide_pin,
              selection: this.state.selection, rating_variables: this.props.rating_variables, metadata: this.props.metadata,
              element: this.props.element }),
            React.createElement(ControlsButton, { label: "Show All", title: show_all_title, disabled: show_all_disabled, click: this.trigger_show_all }),
            React.createElement(ControlsButton, { label: "Close All Pins", title: "", disabled: close_all_disabled, click: this.trigger_close_all }),
            React.createElement(ControlsButtonDownloadDataTable, { selection: this.state.selection, hidden_simulations: this.state.hidden_simulations,
              aid: this.props.aid, mid: this.props.mid, model_name: this.props.model_name, metadata: this.props.metadata,
              indices: this.props.indices })
          ),
          React.createElement(
            ControlsGroup,
            { id: "video-controls", "class": "input-group input-group-xs" },
            React.createElement(ControlsVideo, { video_sync: this.state.video_sync, set_video_sync: this.set_video_sync, video_sync_time_value: this.state.video_sync_time_value,
              set_video_sync_time_value: this.set_video_sync_time_value, set_video_sync_time: this.set_video_sync_time,
              any_video_open: any_video_open
            })
          ),
          React.createElement(
            ControlsGroup,
            { id: "playback-controls" },
            React.createElement(ControlsPlayback, { trigger_jump_to_start: this.trigger_jump_to_start, trigger_frame_back: this.trigger_frame_back, trigger_play: this.trigger_play,
              trigger_pause: this.trigger_pause, trigger_frame_forward: this.trigger_frame_forward, trigger_jump_to_end: this.trigger_jump_to_end,
              any_video_open: any_video_open, disabled: disabled_playback, playing: playing
            })
          )
        );
      }
    }]);

    return ControlsBar;
  }(React.Component);

  var ControlsPlayback = function (_React$Component2) {
    _inherits(ControlsPlayback, _React$Component2);

    function ControlsPlayback(props) {
      _classCallCheck(this, ControlsPlayback);

      return _possibleConstructorReturn(this, (ControlsPlayback.__proto__ || Object.getPrototypeOf(ControlsPlayback)).call(this, props));
    }

    _createClass(ControlsPlayback, [{
      key: "render",
      value: function render() {
        return !this.props.any_video_open ? null : React.createElement(
          React.Fragment,
          null,
          React.createElement(ControlsButton, { title: "Jump to beginning", icon: "fa-fast-backward", disabled: this.props.disabled, click: this.props.trigger_jump_to_start }),
          React.createElement(ControlsButton, { title: "Skip one frame back", icon: "fa-backward", disabled: this.props.disabled, click: this.props.trigger_frame_back }),
          React.createElement(ControlsButton, { title: "Play", icon: "fa-play", hidden: this.props.playing, disabled: this.props.disabled, click: this.props.trigger_play }),
          React.createElement(ControlsButton, { title: "Pause", icon: "fa-pause", hidden: !this.props.playing, disabled: this.props.disabled, click: this.props.trigger_pause }),
          React.createElement(ControlsButton, { title: "Skip one frame forward", icon: "fa-forward", disabled: this.props.disabled, click: this.props.trigger_frame_forward }),
          React.createElement(ControlsButton, { title: "Jump to end", icon: "fa-fast-forward", disabled: this.props.disabled, click: this.props.trigger_jump_to_end })
        );
      }
    }]);

    return ControlsPlayback;
  }(React.Component);

  var ControlsVideo = function (_React$Component3) {
    _inherits(ControlsVideo, _React$Component3);

    function ControlsVideo(props) {
      _classCallCheck(this, ControlsVideo);

      var _this7 = _possibleConstructorReturn(this, (ControlsVideo.__proto__ || Object.getPrototypeOf(ControlsVideo)).call(this, props));

      _this7.handleKeypressBlur = _this7.handleKeypressBlur.bind(_this7);
      return _this7;
    }

    _createClass(ControlsVideo, [{
      key: "handleKeypressBlur",
      value: function handleKeypressBlur(e) {
        // Check if blur event (focusOut) or Enter key was presses
        if (e.type == 'blur' || e.type == 'keypress' && e.which == 13) {
          // Convert value to a floating point number and take its absolute value because videos can't have negative time
          var val = Math.abs(parseFloat(e.target.value));
          // Set value to 0 if previous conversion didn't result in a number
          if (isNaN(val)) {
            val = 0;
          }
          this.props.set_video_sync_time(val);
        }
      }
    }, {
      key: "render",
      value: function render() {
        return !this.props.any_video_open ? null : React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "span",
            { className: "input-group-btn" },
            React.createElement(ControlsButtonToggle, { title: this.props.video_sync ? 'Unsync videos' : 'Sync videos', icon: "fa-video-camera", active: this.props.video_sync, set_active_state: this.props.set_video_sync })
          ),
          React.createElement("input", { type: "text", className: "form-control input-xs video-sync-time", placeholder: "Time", value: this.props.video_sync_time_value, onChange: this.props.set_video_sync_time_value, onBlur: this.handleKeypressBlur, onKeyPress: this.handleKeypressBlur })
        );
      }
    }]);

    return ControlsVideo;
  }(React.Component);

  var ControlsSelection = function (_React$Component4) {
    _inherits(ControlsSelection, _React$Component4);

    function ControlsSelection(props) {
      _classCallCheck(this, ControlsSelection);

      return _possibleConstructorReturn(this, (ControlsSelection.__proto__ || Object.getPrototypeOf(ControlsSelection)).call(this, props));
    }

    _createClass(ControlsSelection, [{
      key: "set_value",
      value: function set_value(variable, variableIndex, value, alert) {
        var self = this;
        dialog.prompt({
          title: "Set Values",
          message: "Set values for " + variable + ":",
          value: '',
          alert: alert,
          buttons: [{ className: "btn-default", label: "Cancel" }, { className: "btn-primary", label: "Apply" }],
          callback: function callback(button, value) {
            if (button.label == "Apply") {
              var value = value().trim();
              var numeric = self.props.metadata["column-types"][variableIndex] != "string";
              var valueValid = value.length > 0;
              if (valueValid && numeric && isNaN(Number(value))) {
                valueValid = false;
              }
              if (valueValid) {
                self.props.element.trigger("set-value", {
                  selection: self.props.selection,
                  variable: variableIndex,
                  value: numeric ? value : '"' + value + '"'
                });
              } else {
                var alert = "Please enter a value.";
                if (numeric) alert = "Please enter a numeric value.";
                self.set_value(variable, variableIndex, value, alert);
              }
            }
          }
        });
      }
    }, {
      key: "render",
      value: function render() {
        var _this9 = this;

        var rating_variable_controls = this.props.rating_variables.map(function (rating_variable) {
          return React.createElement(
            React.Fragment,
            { key: rating_variable },
            React.createElement(
              "li",
              { role: "presentation", className: "dropdown-header" },
              _this9.props.metadata['column-names'][rating_variable]
            ),
            React.createElement(
              "li",
              { role: "presentation" },
              React.createElement(
                "a",
                { role: "menuitem", tabIndex: "-1",
                  onClick: function onClick(e) {
                    return _this9.set_value(_this9.props.metadata['column-names'][rating_variable], rating_variable, e);
                  } },
                "Set"
              )
            )
          );
        });
        return React.createElement(
          "div",
          { className: "btn-group btn-group-xs" },
          React.createElement(
            "button",
            { className: 'btn btn-default dropdown-toggle ' + (this.props.selection.length > 0 ? '' : 'disabled'),
              type: "button", id: "selection-dropdown", "data-toggle": "dropdown", "aria-expanded": "true", title: "Perform Action On Selection" },
            "Selection Action\xA0",
            React.createElement("span", { className: "caret" })
          ),
          React.createElement(
            "ul",
            { id: "selection-switcher", className: "dropdown-menu", role: "menu", "aria-labelledby": "selection-dropdown" },
            rating_variable_controls,
            React.createElement(
              "li",
              { role: "presentation", className: "dropdown-header" },
              "Scatterplot Points"
            ),
            React.createElement(
              "li",
              { role: "presentation", className: this.props.disable_hide_show ? 'disabled' : '' },
              React.createElement(
                "a",
                { role: "menuitem", tabIndex: "-1", onClick: this.props.trigger_hide_selection },
                "Hide"
              )
            ),
            React.createElement(
              "li",
              { role: "presentation", className: this.props.disable_hide_show ? 'disabled' : '' },
              React.createElement(
                "a",
                { role: "menuitem", tabIndex: "-1", onClick: this.props.trigger_hide_unselected },
                "Hide Unselected"
              )
            ),
            React.createElement(
              "li",
              { role: "presentation", className: this.props.disable_hide_show ? 'disabled' : '' },
              React.createElement(
                "a",
                { role: "menuitem", tabIndex: "-1", onClick: this.props.trigger_show_selection },
                "Show"
              )
            ),
            !this.props.hide_pin && React.createElement(
              "li",
              { role: "presentation", className: this.props.disable_pin ? 'disabled' : '' },
              React.createElement(
                "a",
                { role: "menuitem", tabIndex: "-1", onClick: this.props.trigger_pin_selection },
                "Pin"
              )
            )
          )
        );
      }
    }]);

    return ControlsSelection;
  }(React.Component);

  var ControlsGroup = function (_React$Component5) {
    _inherits(ControlsGroup, _React$Component5);

    function ControlsGroup() {
      _classCallCheck(this, ControlsGroup);

      return _possibleConstructorReturn(this, (ControlsGroup.__proto__ || Object.getPrototypeOf(ControlsGroup)).apply(this, arguments));
    }

    _createClass(ControlsGroup, [{
      key: "render",
      value: function render() {
        return React.createElement(
          "div",
          { id: this.props.id, className: (this.props.class ? this.props.class : "btn-group btn-group-xs") + " ControlsGroup" },
          this.props.children
        );
      }
    }]);

    return ControlsGroup;
  }(React.Component);

  var ControlsDropdown = function (_React$Component6) {
    _inherits(ControlsDropdown, _React$Component6);

    function ControlsDropdown(props) {
      _classCallCheck(this, ControlsDropdown);

      return _possibleConstructorReturn(this, (ControlsDropdown.__proto__ || Object.getPrototypeOf(ControlsDropdown)).call(this, props));
    }

    _createClass(ControlsDropdown, [{
      key: "render",
      value: function render() {
        var _this12 = this;

        var optionItems = this.props.items.map(function (item) {
          return React.createElement(
            "li",
            { role: "presentation", key: item.key, className: item.key == _this12.props.selected ? 'active' : '' },
            React.createElement(
              "a",
              { role: "menuitem", tabIndex: "-1", onClick: function onClick(e) {
                  return _this12.props.set_selected(_this12.props.state_label, item.key, _this12.props.trigger, e);
                } },
              item.name
            )
          );
        });
        return React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            { className: "btn-group btn-group-xs" },
            React.createElement(
              "button",
              { className: "btn btn-default dropdown-toggle", type: "button", id: this.props.id, "data-toggle": "dropdown", "aria-expanded": "true", title: this.props.title },
              this.props.label,
              "\xA0",
              React.createElement("span", { className: "caret" })
            ),
            React.createElement(
              "ul",
              { className: "dropdown-menu", role: "menu", "aria-labelledby": this.props.id },
              optionItems
            )
          )
        );
      }
    }]);

    return ControlsDropdown;
  }(React.Component);

  var ControlsButtonToggle = function (_React$Component7) {
    _inherits(ControlsButtonToggle, _React$Component7);

    function ControlsButtonToggle(props) {
      _classCallCheck(this, ControlsButtonToggle);

      return _possibleConstructorReturn(this, (ControlsButtonToggle.__proto__ || Object.getPrototypeOf(ControlsButtonToggle)).call(this, props));
    }

    _createClass(ControlsButtonToggle, [{
      key: "render",
      value: function render() {
        return React.createElement(
          "button",
          { className: 'btn btn-default btn-xs ' + (this.props.active ? 'active' : ''), "data-toggle": "button", title: this.props.title, "aria-pressed": this.props.active, onClick: this.props.set_active_state },
          React.createElement("span", { className: 'fa ' + this.props.icon, "aria-hidden": "true" })
        );
      }
    }]);

    return ControlsButtonToggle;
  }(React.Component);

  var ControlsButton = function (_React$Component8) {
    _inherits(ControlsButton, _React$Component8);

    function ControlsButton(props) {
      _classCallCheck(this, ControlsButton);

      return _possibleConstructorReturn(this, (ControlsButton.__proto__ || Object.getPrototypeOf(ControlsButton)).call(this, props));
    }

    _createClass(ControlsButton, [{
      key: "render",
      value: function render() {
        return this.props.hidden ? null : React.createElement(
          "button",
          { className: "btn btn-default", type: "button", title: this.props.title, disabled: this.props.disabled, onClick: this.props.click },
          this.props.icon && React.createElement("span", { className: 'fa ' + this.props.icon, "aria-hidden": "true" }),
          this.props.label
        );
      }
    }]);

    return ControlsButton;
  }(React.Component);

  var ControlsButtonDownloadDataTable = function (_React$Component9) {
    _inherits(ControlsButtonDownloadDataTable, _React$Component9);

    function ControlsButtonDownloadDataTable(props) {
      _classCallCheck(this, ControlsButtonDownloadDataTable);

      var _this15 = _possibleConstructorReturn(this, (ControlsButtonDownloadDataTable.__proto__ || Object.getPrototypeOf(ControlsButtonDownloadDataTable)).call(this, props));

      _this15.handleClick = _this15.handleClick.bind(_this15);
      return _this15;
    }

    _createClass(ControlsButtonDownloadDataTable, [{
      key: "handleClick",
      value: function handleClick(e) {
        if (this.props.selection.length == 0 && this.props.hidden_simulations.length == 0) {
          this._write_data_table();
        } else {
          this.openCSVSaveChoiceDialog();
        }
      }
    }, {
      key: "_write_data_table",
      value: function _write_data_table(selectionList) {
        var self = this;
        $.ajax({
          type: "POST",
          url: server_root + "models/" + this.props.mid + "/arraysets/" + this.props.aid + "/data",
          data: JSON.stringify({ "hyperchunks": "0/.../..." }),
          contentType: "application/json",
          success: function success(result) {
            self._write_csv(self._convert_to_csv(result, selectionList), self.props.model_name + "_data_table.csv");
          },
          error: function error(request, status, reason_phrase) {
            window.alert("Error retrieving data table: " + reason_phrase);
          }
        });
      }
    }, {
      key: "_write_csv",
      value: function _write_csv(csvData, defaultFilename) {
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
      }
    }, {
      key: "_convert_to_csv",
      value: function _convert_to_csv(array, sl) {
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
        var headers = this.props.metadata["column-names"].slice(0, -1);
        // Adding headers as first element in array of data rows
        rowMajorData.unshift(headers);

        // Creating CSV from data array
        var csv = Papa.unparse(rowMajorData);
        return csv;
      }
    }, {
      key: "openCSVSaveChoiceDialog",
      value: function openCSVSaveChoiceDialog() {
        var self = this;
        var txt = "";
        var buttons_save = [{ className: "btn-default", label: "Cancel" }, { className: "btn-primary", label: "Save Entire Table", icon_class: "fa fa-table" }];

        if (this.props.selection.length > 0) {
          txt += "You have " + this.props.selection.length + " rows selected. ";
          buttons_save.splice(buttons_save.length - 1, 0, { className: "btn-primary", label: "Save Selected", icon_class: "fa fa-check" });
        }
        if (this.props.hidden_simulations.length > 0) {
          var visibleRows = this.props.metadata['row-count'] - this.props.hidden_simulations.length;
          txt += "You have " + visibleRows + " rows visible. ";
          buttons_save.splice(buttons_save.length - 1, 0, { className: "btn-primary", label: "Save Visible", icon_class: "fa fa-eye" });
        }

        txt += "What would you like to do?";

        dialog.dialog({
          title: "Download Choices",
          message: txt,
          buttons: buttons_save,
          callback: function callback(button) {
            if (button.label == "Save Entire Table") self._write_data_table();else if (button.label == "Save Selected") self._write_data_table(self.props.selection);else if (button.label == "Save Visible") self._write_data_table(self._filterIndices());
          }
        });
      }

      // Remove hidden_simulations from indices

    }, {
      key: "_filterIndices",
      value: function _filterIndices() {
        var indices = this.props.indices;
        var hidden_simulations = this.props.hidden_simulations;
        var filtered_indices = this._cloneArrayBuffer(indices);
        var length = indices.length;

        // Remove hidden simulations and NaNs and empty strings
        for (var i = length - 1; i >= 0; i--) {
          var hidden = $.inArray(indices[i], hidden_simulations) > -1;
          if (hidden) {
            filtered_indices.splice(i, 1);
          }
        }

        return filtered_indices;
      }

      // Clones an ArrayBuffer or Array

    }, {
      key: "_cloneArrayBuffer",
      value: function _cloneArrayBuffer(source) {
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
      }
    }, {
      key: "render",
      value: function render() {
        return React.createElement(ControlsButton, { icon: "fa-download", title: "Download Data Table", click: this.handleClick });
      }
    }]);

    return ControlsButtonDownloadDataTable;
  }(React.Component);

  $.widget("parameter_image.controls", {
    options: {
      mid: null,
      model_name: null,
      aid: null,
      metadata: null,
      "x-variable": null,
      "y-variable": null,
      "image-variable": null,
      "color-variable": null,
      "auto-scale": true,
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
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = this.options.x_variables[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var x_variable = _step3.value;

          x_axis_dropdown_items.push({
            key: x_variable,
            name: self.options.metadata['column-names'][x_variable]
          });
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }

      var y_axis_dropdown_items = [];
      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = this.options.y_variables[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var y_variable = _step4.value;

          y_axis_dropdown_items.push({
            key: y_variable,
            name: self.options.metadata['column-names'][y_variable]
          });
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4.return) {
            _iterator4.return();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }

      var color_variable_dropdown_items = [];
      var _iteratorNormalCompletion5 = true;
      var _didIteratorError5 = false;
      var _iteratorError5 = undefined;

      try {
        for (var _iterator5 = this.options.color_variables[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
          var color_variable = _step5.value;

          color_variable_dropdown_items.push({
            key: color_variable,
            name: self.options.metadata['column-names'][color_variable]
          });
        }
      } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion5 && _iterator5.return) {
            _iterator5.return();
          }
        } finally {
          if (_didIteratorError5) {
            throw _iteratorError5;
          }
        }
      }

      var media_variable_dropdown_items = [];
      media_variable_dropdown_items.push({ key: -1, name: "None" });
      var _iteratorNormalCompletion6 = true;
      var _didIteratorError6 = false;
      var _iteratorError6 = undefined;

      try {
        for (var _iterator6 = this.options.image_variables[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
          var media_variable = _step6.value;

          media_variable_dropdown_items.push({
            key: media_variable,
            name: self.options.metadata['column-names'][media_variable]
          });
        }
      } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion6 && _iterator6.return) {
            _iterator6.return();
          }
        } finally {
          if (_didIteratorError6) {
            throw _iteratorError6;
          }
        }
      }

      var dropdowns = [{
        id: 'x-axis-dropdown',
        label: 'X Axis',
        title: 'Change X Axis Variable',
        state_label: 'x_variable',
        trigger: 'x-selection-changed',
        items: x_axis_dropdown_items,
        selected: self.options["x-variable"]
      }, {
        id: 'y-axis-dropdown',
        label: 'Y Axis',
        title: 'Change Y Axis Variable',
        state_label: 'y_variable',
        trigger: 'y-selection-changed',
        items: y_axis_dropdown_items,
        selected: self.options["y-variable"]
      }, {
        id: 'color-dropdown',
        label: 'Point Color',
        title: 'Change Point Color',
        state_label: 'color_variable',
        trigger: 'color-selection-changed',
        items: color_variable_dropdown_items,
        selected: self.options["color-variable"]
      }, {
        id: 'image-dropdown',
        label: 'Media Set',
        title: 'Change Media Set Variable',
        state_label: 'media_variable',
        trigger: 'images-selection-changed',
        items: media_variable_dropdown_items,
        selected: self.options["image-variable"]
      }];

      var controls_bar = React.createElement(ControlsBar, { element: self.element,
        dropdowns: dropdowns,
        auto_scale: self.options["auto-scale"],
        hidden_simulations: self.options.hidden_simulations,
        disable_hide_show: self.options.disable_hide_show,
        open_images: self.options.open_images,
        selection: self.options.selection,
        mid: self.options.mid,
        aid: self.options.aid,
        model_name: self.options.model_name,
        metadata: self.options.metadata,
        indices: self.options.indices,
        media_variables: self.options.image_variables,
        rating_variables: self.options.rating_variables,
        video_sync: self.options["video-sync"],
        video_sync_time: self.options["video-sync-time"]
      });

      self.ControlsBarComponent = ReactDOM.render(controls_bar, document.getElementById('react-controls'));
    },

    _setOption: function _setOption(key, value) {
      var self = this;

      //console.log("sparameter_image.variableswitcher._setOption()", key, value);
      this.options[key] = value;

      if (key == "x-variable") {
        self.ControlsBarComponent.setState({ x_variable: Number(self.options["x-variable"]) });
      } else if (key == "y-variable") {
        self.ControlsBarComponent.setState({ y_variable: Number(self.options["y-variable"]) });
      } else if (key == "image-variable") {
        self.ControlsBarComponent.setState({ media_variable: Number(self.options["image-variable"]) });
      } else if (key == "color-variable") {
        self.ControlsBarComponent.setState({ color_variable: Number(self.options["color-variable"]) });
      } else if (key == 'selection') {
        self.ControlsBarComponent.setState({ selection: self.options.selection.slice() });
      } else if (key == 'hidden_simulations') {
        self.ControlsBarComponent.setState({ hidden_simulations: self.options.hidden_simulations.slice() });
      } else if (key == 'open_images') {
        self.ControlsBarComponent.setState({ open_images: self.options.open_images.slice() });
      } else if (key == 'disable_hide_show') {
        self.ControlsBarComponent.setState({ disable_hide_show: self.options.disable_hide_show });
      } else if (key == 'video-sync-time') {
        self.ControlsBarComponent.setState({
          video_sync_time: self.options['video-sync-time'],
          video_sync_time_value: self.options['video-sync-time']
        });
      }
    }
  });
});
