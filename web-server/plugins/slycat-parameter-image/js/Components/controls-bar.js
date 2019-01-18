import React from "react";
import { Provider } from 'react-redux';
import ControlsPlayback from './controls-playback';
import ControlsDropdown from './controls-dropdown';
import ControlsVideo from './controls-video';
import ControlsSelection from './controls-selection';
import ControlsGroup from './controls-group';
import ControlsButtonToggle from './controls-button-toggle';
import ControlsButton from './controls-button';
import ControlsButtonDownloadDataTable from './controls-button-download-data-table';
import VisibleVarOptions from './visible-var-options';

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
      var_settings: this.props.var_settings,
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
    if(key === this.state[state_label])
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
    // Define default button style
    const button_style = 'btn-outline-dark';
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
        return (<ControlsDropdown 
                  key={dropdown.id} 
                  id={dropdown.id} 
                  label={dropdown.label} 
                  title={dropdown.title}
                  state_label={dropdown.state_label} 
                  trigger={dropdown.trigger} 
                  items={dropdown.items}
                  selected={this.state[dropdown.state_label]} 
                  set_selected={this.set_selected} 
                  button_style={button_style}
                />);
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
      <Provider store={window.store}>
      <React.Fragment>
        <ControlsGroup id="scatterplot-controls">
          {dropdowns}
          <VisibleVarOptions 
            selection={this.state.selection} 
            hidden_simulations={this.state.hidden_simulations}
            aid={this.props.aid} mid={this.props.mid} 
            model_name={this.props.model_name} 
            metadata={this.props.metadata}
            indices={this.props.indices} 
            axes_variables={this.props.axes_variables}
          />
        </ControlsGroup>
        <ControlsGroup id="selection-controls">
          <ControlsButtonToggle title="Auto Scale" icon="fa-external-link" active={this.state.auto_scale} set_active_state={this.set_auto_scale} />
          <ControlsSelection 
            trigger_hide_selection={this.trigger_hide_selection} 
            trigger_hide_unselected={this.trigger_hide_unselected}
            trigger_show_selection={this.trigger_show_selection} 
            trigger_pin_selection={this.trigger_pin_selection}
            disable_hide_show={this.state.disable_hide_show} 
            disable_pin={disable_pin} 
            hide_pin={hide_pin}
            selection={this.state.selection} 
            rating_variables={this.props.rating_variables} 
            metadata={this.props.metadata}
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
      </Provider>
    );
  }
}

export default ControlsBar