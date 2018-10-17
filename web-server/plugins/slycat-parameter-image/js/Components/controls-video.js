import React from "react";
import ControlsButtonToggle from "./controls-button-toggle";

class ControlsVideo extends React.Component {
  constructor(props) {
    super(props);
    this.handleKeypressBlur = this.handleKeypressBlur.bind(this);
  }

  handleKeypressBlur(e) {
    // Check if blur event (focusOut) or Enter key was presses
    if(e.type === 'blur' || (e.type === 'keypress' && e.which === 13)) {
      // Convert value to a floating point number and take its absolute value because videos can't have negative time
      let val = Math.abs(parseFloat(e.target.value));
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

export default ControlsVideo