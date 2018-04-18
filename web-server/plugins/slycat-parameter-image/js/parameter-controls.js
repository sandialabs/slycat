/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC .
   Under the terms of Contract  DE-NA0003525 with National Technology and Engineering
   Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

define('slycat-parameter-image-controls',
  [
    '../../../js/slycat-server-root',
    '../../../js/slycat-dialog-webpack',
    'lodash',
    'papaparse',
    'react',
    'react-dom',
    'jquery-ui'
  ], function(server_root, dialog, _, Papa, React, ReactDOM) {

    class ControlsBar extends React.Component {
      constructor(props) {
        super(props);
        this.state = {
          auto_scale: this.props.auto_scale,
          hidden_simulations: this.props.hidden_simulations,
          disable_hide_show: this.props.disable_hide_show,
          open_images: this.props.open_images,
          selection: this.props.selection,
          video_sync: this.props.video_sync,
          video_sync_time: this.props.video_sync_time,
          video_sync_time_value: this.props.video_sync_time,
        };
        for(let dropdown of this.props.dropdowns)
        {
          this.state[dropdown.state_label] = dropdown.selected;
        }
        // This binding is necessary to make `this` work in the callback
        this.set_selected = this.set_selected.bind(this);
        this.set_auto_scale = this.set_auto_scale.bind(this);
        this.set_video_sync = this.set_video_sync.bind(this);
        this.set_video_sync_time = this.set_video_sync_time.bind(this);
        this.set_video_sync_time_value = this.set_video_sync_time_value.bind(this);
        this.trigger_show_all = this.trigger_show_all.bind(this);
        this.trigger_close_all = this.trigger_close_all.bind(this);
        this.trigger_hide_selection = this.trigger_hide_selection.bind(this);
        this.trigger_hide_unselected = this.trigger_hide_unselected.bind(this);
        this.trigger_show_selection = this.trigger_show_selection.bind(this);
        this.trigger_pin_selection = this.trigger_pin_selection.bind(this);
        this.trigger_jump_to_start = this.trigger_jump_to_start.bind(this);
        this.trigger_frame_back = this.trigger_frame_back.bind(this);
        this.trigger_play = this.trigger_play.bind(this);
        this.trigger_pause = this.trigger_pause.bind(this);
        this.trigger_frame_forward = this.trigger_frame_forward.bind(this);
        this.trigger_jump_to_end = this.trigger_jump_to_end.bind(this);
      }

      set_selected(state_label, key, trigger, e) {
        // Do nothing if the state hasn't changed (e.g., user clicked on currently selected variable)
        if(key == this.state[state_label])
        {
          return;
        }
        // That function will receive the previous state as the first argument, and the props at the time the update is applied as the
        // second argument. This format is favored because this.props and this.state may be updated asynchronously,
        // you should not rely on their values for calculating the next state.
        const obj = {};
        obj[state_label] = key;
        this.setState((prevState, props) => (obj));
        // This is the legacy way of letting the rest of non-React components that the state changed. Remove once we are converted to React.
        this.props.element.trigger(trigger, key);
      }

      set_auto_scale(e) {
        this.setState((prevState, props) => {
          const new_auto_scale = !prevState.auto_scale;
          this.props.element.trigger("auto-scale", new_auto_scale);
          return {auto_scale: new_auto_scale};
        });
      }

      set_video_sync(e) {
        this.setState((prevState, props) => {
          const new_video_sync = !prevState.video_sync;
          this.props.element.trigger("video-sync", new_video_sync);
          return {video_sync: new_video_sync};
        });
      }

      set_video_sync_time(value) {
        const new_video_sync_time = value;
        this.setState((prevState, props) => {
          this.props.element.trigger("video-sync-time", value);
          // Setting both video_sync_time, which tracks the validated video_sync_time, and 
          // video_sync_time_value, which tracks the value of the input field and can contain invalidated data (letters, negatives, etc.)
          return {
            video_sync_time: value,
            video_sync_time_value: value,
          };
        });
      }

      set_video_sync_time_value(e) {
        const new_video_sync_time = e.target.value;
        this.setState((prevState, props) => {
          return {video_sync_time_value: new_video_sync_time};
        });
      }

      trigger_show_all(e) {
        this.props.element.trigger("show-all");
      }

      trigger_close_all(e) {
        this.props.element.trigger("close-all");
      }

      trigger_hide_selection(e) {
        if(!this.state.disable_hide_show) {
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

      trigger_hide_unselected(e) {
        if(!this.state.disable_hide_show) {
          this.props.element.trigger("hide-unselected", this.state.selection);
        }
      }

      trigger_show_selection(e) {
        if(!this.state.disable_hide_show) {
          this.props.element.trigger("show-selection", this.state.selection);
        }
      }

      trigger_pin_selection(e) {
        if(!this.state.disable_hide_show) {
          this.props.element.trigger("pin-selection", this.state.selection);
        }
      }

      trigger_jump_to_start(e) {
        this.props.element.trigger("jump-to-start");
      }

      trigger_frame_back(e) {
        this.props.element.trigger("frame-back");
      }

      trigger_play(e) {
        this.props.element.trigger("play");
      }

      trigger_pause(e) {
        this.props.element.trigger("pause");
      }

      trigger_frame_forward(e) {
        this.props.element.trigger("frame-forward");
      }

      trigger_jump_to_end(e) {
        this.props.element.trigger("jump-to-end");
      }

      render() {
        // Disable show all button when there are no hidden simulations or when the disable_hide_show functionality flag is on (set by filters)
        const show_all_disabled = this.state.hidden_simulations.length == 0 || this.state.disable_hide_show;
        const show_all_title = show_all_disabled ? 'There are currently no hidden scatterplot points to show.' : 'Show All Hidden Scatterplot Points';
        // Disable close all button when there are no open frames
        const close_all_disabled = this.state.open_images.length == 0;
        const disable_pin = !(this.state.media_variable && this.state.media_variable >= 0);
        const hide_pin = !(this.props.media_variables.length > 0);
        const dropdowns = this.props.dropdowns.map((dropdown) => 
        {
          if(dropdown.items.length > 1)
          {
            return (<ControlsDropdown key={dropdown.id} id={dropdown.id} label={dropdown.label} title={dropdown.title} 
              state_label={dropdown.state_label} trigger={dropdown.trigger} items={dropdown.items} 
              selected={this.state[dropdown.state_label]} set_selected={this.set_selected} />);
          }
          else
          {
            return false;
          }
        });

        // Video and playback controls
        let any_video_open = false;
        let any_video_playing = false;
        let current_frame_video = false;
        let current_frame_video_playing = false;
        for(let open_media of this.state.open_images)
        {
          if(open_media.video){
            any_video_open = true;
            if(open_media.current_frame)
            {
              current_frame_video = true;
              if(open_media.playing)
              {
                current_frame_video_playing = true;
                any_video_playing = true;
                break;
              }
            }
            if(open_media.playing)
            {
              any_video_playing = true;
            }
          }
          // No need to keep searching if we found a video and the current frame is also a video
          if(any_video_open && current_frame_video && any_video_playing && current_frame_video_playing)
          {
            break;
          }
        }
        // Disable playback controls when the current frame is not a video and sync videos is not toggled
        const disabled_playback = !(this.state.video_sync || current_frame_video);
        // Track if any video is playing when sync is on or if the current video is playing if sync is off
        // This is used to decide if the play or the pause button is visible in the playback controls
        const playing = (this.state.video_sync && any_video_playing) || (!this.state.video_sync && current_frame_video_playing);

        return (
          <React.Fragment>
            <ControlsGroup id="scatterplot-controls">
              {dropdowns}
            </ControlsGroup>
            <ControlsGroup id="selection-controls">
              <ControlsButtonToggle title="Auto Scale" icon="fa-external-link" active={this.state.auto_scale} set_active_state={this.set_auto_scale} />
              <ControlsSelection trigger_hide_selection={this.trigger_hide_selection} trigger_hide_unselected={this.trigger_hide_unselected} 
                trigger_show_selection={this.trigger_show_selection} trigger_pin_selection={this.trigger_pin_selection}
                disable_hide_show={this.state.disable_hide_show} disable_pin={disable_pin} hide_pin={hide_pin}
                selection={this.state.selection} rating_variables={this.props.rating_variables} metadata={this.props.metadata} 
                element={this.props.element} />
              <ControlsButton label="Show All" title={show_all_title} disabled={show_all_disabled} click={this.trigger_show_all} />
              <ControlsButton label="Close All Pins" title="" disabled={close_all_disabled} click={this.trigger_close_all} />
              <ControlsButtonDownloadDataTable selection={this.state.selection} hidden_simulations={this.state.hidden_simulations} 
                aid={this.props.aid} mid={this.props.mid} model_name={this.props.model_name} metadata={this.props.metadata} 
                indices={this.props.indices} />
            </ControlsGroup>
            <ControlsGroup id="video-controls" class="input-group input-group-xs">
              <ControlsVideo video_sync={this.state.video_sync} set_video_sync={this.set_video_sync} video_sync_time_value={this.state.video_sync_time_value} 
                set_video_sync_time_value={this.set_video_sync_time_value} set_video_sync_time={this.set_video_sync_time} 
                any_video_open={any_video_open}
              />
            </ControlsGroup>
            <ControlsGroup id="playback-controls">
              <ControlsPlayback trigger_jump_to_start={this.trigger_jump_to_start} trigger_frame_back={this.trigger_frame_back} trigger_play={this.trigger_play}
                trigger_pause={this.trigger_pause} trigger_frame_forward={this.trigger_frame_forward} trigger_jump_to_end={this.trigger_jump_to_end}
                any_video_open={any_video_open} disabled={disabled_playback} playing={playing}
              />
            </ControlsGroup>
          </React.Fragment>
        );
      }
    }

  class ControlsPlayback extends React.Component {
    constructor(props) {
      super(props);
    }

    render() {
      return !this.props.any_video_open ? null : (
        <React.Fragment>
          <ControlsButton title="Jump to beginning" icon="fa-fast-backward" disabled={this.props.disabled} click={this.props.trigger_jump_to_start} />
          <ControlsButton title="Skip one frame back" icon="fa-backward" disabled={this.props.disabled} click={this.props.trigger_frame_back} />
          <ControlsButton title="Play" icon="fa-play" hidden={this.props.playing} disabled={this.props.disabled} click={this.props.trigger_play} />
          <ControlsButton title="Pause" icon="fa-pause" hidden={!this.props.playing} disabled={this.props.disabled} click={this.props.trigger_pause} />
          <ControlsButton title="Skip one frame forward" icon="fa-forward" disabled={this.props.disabled} click={this.props.trigger_frame_forward} />
          <ControlsButton title="Jump to end" icon="fa-fast-forward" disabled={this.props.disabled} click={this.props.trigger_jump_to_end} />
        </React.Fragment>
      );
    }
  }

  class ControlsVideo extends React.Component {
    constructor(props) {
      super(props);
      this.handleKeypressBlur = this.handleKeypressBlur.bind(this);
    }

    handleKeypressBlur(e) {
      // Check if blur event (focusOut) or Enter key was presses
      if(e.type == 'blur' || (e.type == 'keypress' && e.which == 13)) {
        // Convert value to a floating point number and take its absolute value because videos can't have negative time
        var val = Math.abs(parseFloat(e.target.value));
        // Set value to 0 if previous conversion didn't result in a number
        if(isNaN(val))
        {
          val = 0;
        }
        this.props.set_video_sync_time(val);
      }
    }

    render() {
      return !this.props.any_video_open ? null : (
        <React.Fragment>
          <span className='input-group-btn'>
            <ControlsButtonToggle title={this.props.video_sync ? 'Unsync videos' : 'Sync videos'} icon="fa-video-camera" active={this.props.video_sync} set_active_state={this.props.set_video_sync} />
          </span>
          <input type='text' className='form-control input-xs video-sync-time' placeholder='Time' value={this.props.video_sync_time_value} onChange={this.props.set_video_sync_time_value} onBlur={this.handleKeypressBlur} onKeyPress={this.handleKeypressBlur} />
        </React.Fragment>
      );
    }
  }

  class ControlsSelection extends React.Component {
    constructor(props) {
      super(props);
    }
    
    set_value(variable, variableIndex, value, alert) {
      var self = this;
      dialog.prompt({
        title: "Set Values",
        message: "Set values for " + variable + ":",
        value: '',
        alert: alert,
        buttons: [
          {className: "btn-default", label:"Cancel"}, 
          {className: "btn-primary",  label:"Apply"}
        ],
        callback: function(button, value)
        {
          if(button.label == "Apply")
          {
            var value = value().trim();
            var numeric = self.props.metadata["column-types"][variableIndex] != "string";
            var valueValid = value.length > 0;
            if( valueValid && numeric && isNaN(Number(value)) ) {
              valueValid = false;
            }
            if(valueValid) {
              self.props.element.trigger("set-value", {
                selection : self.props.selection,
                variable : variableIndex,
                value : numeric ? value : '"' + value + '"',
              });
            } else {
              var alert = "Please enter a value.";
              if(numeric)
                alert = "Please enter a numeric value.";
              self.set_value(variable, variableIndex, value, alert);
            }
          }
        },
      });
    }

    render() {
      let rating_variable_controls = this.props.rating_variables.map((rating_variable) =>
        <React.Fragment key={rating_variable}>
          <li role="presentation" className="dropdown-header">{this.props.metadata['column-names'][rating_variable]}</li>
          <li role='presentation'><a role="menuitem" tabIndex="-1" 
            onClick={(e) => this.set_value(this.props.metadata['column-names'][rating_variable], rating_variable, e)}>Set</a></li>
        </React.Fragment>
      );
      return (
        <div className="btn-group btn-group-xs">
          <button className={'btn btn-default dropdown-toggle ' + (this.props.selection.length > 0 ? '' : 'disabled')} 
            type="button" id="selection-dropdown" data-toggle="dropdown" aria-expanded="true" title="Perform Action On Selection">
            Selection Action&nbsp;
            <span className="caret"></span>
          </button>
          <ul id="selection-switcher" className="dropdown-menu" role="menu" aria-labelledby="selection-dropdown">
            {rating_variable_controls}
            <li role="presentation" className="dropdown-header">Scatterplot Points</li>
            <li role='presentation' className={this.props.disable_hide_show ? 'disabled' : ''}>
              <a role="menuitem" tabIndex="-1" onClick={this.props.trigger_hide_selection}>Hide</a>
            </li>
            <li role='presentation' className={this.props.disable_hide_show ? 'disabled' : ''}>
              <a role="menuitem" tabIndex="-1" onClick={this.props.trigger_hide_unselected}>Hide Unselected</a>
            </li>
            <li role='presentation' className={this.props.disable_hide_show ? 'disabled' : ''}>
              <a role="menuitem" tabIndex="-1" onClick={this.props.trigger_show_selection}>Show</a>
            </li>
            {!this.props.hide_pin &&
              <li role='presentation' className={this.props.disable_pin ? 'disabled' : ''}>
                <a role="menuitem" tabIndex="-1" onClick={this.props.trigger_pin_selection}>Pin</a>
              </li>
            }
          </ul>
        </div>
      );
    }
  }

  class ControlsGroup extends React.Component {
    render() {
      return (
        <div id={this.props.id} className={(this.props.class ? this.props.class : "btn-group btn-group-xs") + " ControlsGroup"}>
          {this.props.children}
        </div>
      );
    }
  }

  class ControlsDropdown extends React.Component {
    constructor(props) {
      super(props);
    }

    render() {
      let optionItems = this.props.items.map((item) => 
        <li role='presentation' key={item.key} className={item.key == this.props.selected ? 'active' : ''}>
          <a role="menuitem" tabIndex="-1" onClick={(e) => this.props.set_selected(this.props.state_label, item.key, this.props.trigger, e)}>
            {item.name}
          </a>
        </li>);
      return (
        <React.Fragment>
        <div className="btn-group btn-group-xs">
          <button className="btn btn-default dropdown-toggle" type="button" id={this.props.id} data-toggle="dropdown" aria-expanded="true" title={this.props.title}>
            {this.props.label}&nbsp;
            <span className="caret"></span>
          </button>
          <ul className="dropdown-menu" role="menu" aria-labelledby={this.props.id}>
            {optionItems}
          </ul>
        </div>
        </React.Fragment>
      );
    }
  }

  class ControlsButtonToggle extends React.Component {
    constructor(props) {
      super(props);
    }

    render() {
      return (
        <button className={'btn btn-default btn-xs ' + (this.props.active ? 'active' : '')} data-toggle="button" title={this.props.title} aria-pressed={this.props.active} onClick={this.props.set_active_state}>
          <span className={'fa ' + this.props.icon} aria-hidden="true"></span>
        </button>
      );
    }
  }

  class ControlsButton extends React.Component {
    constructor(props) {
      super(props);
    }

    render() {
      return this.props.hidden ? null : (
        <button className="btn btn-default" type="button" title={this.props.title} disabled={this.props.disabled} onClick={this.props.click}>
          {this.props.icon &&
            <span className={'fa ' + this.props.icon} aria-hidden="true"></span>
          }
          {this.props.label}
        </button>
      );
    }
  }

  class ControlsButtonDownloadDataTable extends React.Component {
    constructor(props) {
      super(props);
      this.handleClick = this.handleClick.bind(this);
    }

    handleClick(e) {
      if (this.props.selection.length == 0 && this.props.hidden_simulations.length == 0) {
        this._write_data_table();
      } else {
        this.openCSVSaveChoiceDialog();
      }
    }

    _write_data_table(selectionList) {
      var self = this;
      $.ajax(
      {
        type : "POST",
        url : server_root + "models/" + this.props.mid + "/arraysets/" + this.props.aid + "/data",
        data: JSON.stringify({"hyperchunks": "0/.../..."}),
        contentType: "application/json",
        success : function(result)
        {
          self._write_csv( self._convert_to_csv(result, selectionList), self.props.model_name + "_data_table.csv" );
        },
        error: function(request, status, reason_phrase)
        {
          window.alert("Error retrieving data table: " + reason_phrase);
        }
      });
    }

    _write_csv(csvData, defaultFilename) {
      var blob = new Blob([ csvData ], {
        type : "application/csv;charset=utf-8;"
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

    _convert_to_csv(array, sl) {
      // Note that array.data is column-major:  array.data[0][*] is the first column
      var self = this;
      
      // Converting data array from column major to row major
      var rowMajorData = _.zip(...array);

      // If we have a selection list, remove everything but those elements from the data array
      if(sl != undefined && sl.length > 0)
      {
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

    openCSVSaveChoiceDialog() {
      var self = this;
      var txt = "";
      var buttons_save = [
        {className: "btn-default", label:"Cancel"}, 
        {className: "btn-primary", label:"Save Entire Table", icon_class:"fa fa-table"}
      ];

      if(this.props.selection.length > 0)
      {
        txt += "You have " + this.props.selection.length + " rows selected. ";
        buttons_save.splice(buttons_save.length-1, 0, {className: "btn-primary", label:"Save Selected", icon_class:"fa fa-check"});
      }
      if(this.props.hidden_simulations.length > 0)
      {
        var visibleRows = this.props.metadata['row-count'] - this.props.hidden_simulations.length;
        txt += "You have " + visibleRows + " rows visible. ";
        buttons_save.splice(buttons_save.length-1, 0, {className: "btn-primary", label:"Save Visible", icon_class:"fa fa-eye"});
      }

      txt += "What would you like to do?";

      dialog.dialog(
      {
        title: "Download Choices",
        message: txt,
        buttons: buttons_save,
        callback: function(button)
        {
          if(button.label == "Save Entire Table")
            self._write_data_table();
          else if(button.label == "Save Selected")
            self._write_data_table( self.props.selection );
          else if(button.label == "Save Visible")
            self._write_data_table( self._filterIndices() );
        },
      });
    }

    // Remove hidden_simulations from indices
    _filterIndices() {
      var indices = this.props.indices;
      var hidden_simulations = this.props.hidden_simulations;
      var filtered_indices = this._cloneArrayBuffer(indices);
      var length = indices.length;

      // Remove hidden simulations and NaNs and empty strings
      for(var i=length-1; i>=0; i--){
        var hidden = $.inArray(indices[i], hidden_simulations) > -1;
        if(hidden) {
          filtered_indices.splice(i, 1);
        }
      }

      return filtered_indices;
    }

    // Clones an ArrayBuffer or Array
    _cloneArrayBuffer(source) {
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
      for(var i = 0; i < source.length; i++)
      {
        clone.push(source[i]);
      }
      return clone;
    }

    render() {
      return (
        <ControlsButton icon="fa-download" title="Download Data Table" click={this.handleClick} />
      );
    }
  }

  $.widget("parameter_image.controls",
  {
    options:
    {
      mid : null,
      model_name : null,
      aid : null,
      metadata : null,
      "x-variable" : null,
      "y-variable" : null,
      "image-variable" : null,
      "color-variable" : null,
      "auto-scale" : true,
      x_variables : [],
      y_variables : [],
      image_variables : [],
      color_variables : [],
      rating_variables : [],
      category_variables : [],
      selection : [],
      hidden_simulations : [],
      indices : [],
      disable_hide_show : false,
      open_images : [],
      "video-sync" : false,
      "video-sync-time" : 0,
    },

    _create: function()
    {
      var self = this;

      const x_axis_dropdown_items = [];
      for(let x_variable of this.options.x_variables) {
        x_axis_dropdown_items.push({
          key: x_variable, 
          name: self.options.metadata['column-names'][x_variable]
        });
      }

      const y_axis_dropdown_items = [];
      for(let y_variable of this.options.y_variables) {
        y_axis_dropdown_items.push({
          key: y_variable, 
          name: self.options.metadata['column-names'][y_variable]
        });
      }

      const color_variable_dropdown_items = [];
      for(let color_variable of this.options.color_variables) {
        color_variable_dropdown_items.push({
          key: color_variable, 
          name: self.options.metadata['column-names'][color_variable]
        });
      }

      const media_variable_dropdown_items = [];
      media_variable_dropdown_items.push({key: -1, name: "None"});
      for(let media_variable of this.options.image_variables) {
        media_variable_dropdown_items.push({
          key: media_variable, 
          name: self.options.metadata['column-names'][media_variable]
        });
      }

      const dropdowns = [
        {
          id: 'x-axis-dropdown',
          label: 'X Axis',
          title: 'Change X Axis Variable', 
          state_label:'x_variable',
          trigger: 'x-selection-changed',
          items: x_axis_dropdown_items,
          selected: self.options["x-variable"],
        },
        {
          id: 'y-axis-dropdown',
          label: 'Y Axis',
          title: 'Change Y Axis Variable', 
          state_label:'y_variable',
          trigger: 'y-selection-changed',
          items: y_axis_dropdown_items,
          selected: self.options["y-variable"],
        },
        {
          id: 'color-dropdown',
          label: 'Point Color',
          title: 'Change Point Color', 
          state_label:'color_variable',
          trigger: 'color-selection-changed',
          items: color_variable_dropdown_items,
          selected: self.options["color-variable"],
        },
        {
          id: 'image-dropdown',
          label: 'Media Set',
          title: 'Change Media Set Variable', 
          state_label:'media_variable',
          trigger: 'images-selection-changed',
          items: media_variable_dropdown_items,
          selected: self.options["image-variable"],
        },
      ];

      const controls_bar = <ControlsBar element={self.element} 
        dropdowns={dropdowns}
        auto_scale={self.options["auto-scale"]} 
        hidden_simulations={self.options.hidden_simulations}
        disable_hide_show={self.options.disable_hide_show}
        open_images={self.options.open_images}
        selection={self.options.selection}
        mid={self.options.mid}
        aid={self.options.aid}
        model_name={self.options.model_name}
        metadata={self.options.metadata}
        indices={self.options.indices}
        media_variables={self.options.image_variables}
        rating_variables={self.options.rating_variables}
        video_sync={self.options["video-sync"]}
        video_sync_time={self.options["video-sync-time"]}
      />;

      self.ControlsBarComponent = ReactDOM.render(
        controls_bar,
        document.getElementById('react-controls')
      );

    },

    _setOption: function(key, value)
    {
      var self = this;

      //console.log("sparameter_image.variableswitcher._setOption()", key, value);
      this.options[key] = value;

      if(key == "x-variable")
      {
        self.ControlsBarComponent.setState({x_variable: Number(self.options["x-variable"])});
      }
      else if(key == "y-variable")
      {
        self.ControlsBarComponent.setState({y_variable: Number(self.options["y-variable"])});
      }
      else if(key == "image-variable")
      {
        self.ControlsBarComponent.setState({media_variable: Number(self.options["image-variable"])});
      }
      else if(key == "color-variable")
      {
        self.ControlsBarComponent.setState({color_variable: Number(self.options["color-variable"])});
      }
      else if(key == 'selection')
      {
        self.ControlsBarComponent.setState({selection: self.options.selection.slice()});
      }
      else if(key == 'hidden_simulations')
      {
        self.ControlsBarComponent.setState({hidden_simulations: self.options.hidden_simulations.slice()});
      }
      else if(key == 'open_images')
      {
        self.ControlsBarComponent.setState({open_images: self.options.open_images.slice()});
      }
      else if(key == 'disable_hide_show')
      {
        self.ControlsBarComponent.setState({disable_hide_show: self.options.disable_hide_show});
      }
      else if(key == 'video-sync-time')
      {
        self.ControlsBarComponent.setState({
          video_sync_time: self.options['video-sync-time'],
          video_sync_time_value: self.options['video-sync-time'],
        });
      }
    },
  });
});
