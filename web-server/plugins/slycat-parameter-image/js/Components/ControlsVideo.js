import React from "react";
import ControlsButtonToggle from "./ControlsButtonToggle";
import { faVideo } from "@fortawesome/free-solid-svg-icons";

class ControlsVideo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      video_sync_time_value: this.props.video_sync_time,
    };
    this.handleKeypressBlur = this.handleKeypressBlur.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props.video_sync_time !== prevProps.video_sync_time) {
      this.setState({ video_sync_time_value: this.props.video_sync_time });
    }
  }

  set_video_sync_time_value = (e) => {
    this.setState({ video_sync_time_value: e.target.value });
  };

  handleKeypressBlur(e) {
    // Check if blur event (focusOut) or Enter key was presses
    if (e.type === "blur" || (e.type === "keypress" && e.which === 13)) {
      // Convert value to a floating point number and take its absolute value because videos can't have negative time
      let val = Math.abs(parseFloat(e.target.value));
      // Set value to 0 if previous conversion didn't result in a number
      if (isNaN(val)) {
        val = 0;
      }
      this.props.set_video_sync_time(val);
    }
  }

  render() {
    return !this.props.any_video_open ? null : (
      <React.Fragment>
        <div className="input-group-prepend">
          <ControlsButtonToggle
            title={this.props.video_sync ? "Unsync videos" : "Sync videos"}
            icon={faVideo}
            active={this.props.video_sync}
            set_active_state={this.props.set_video_sync}
            button_style={this.props.button_style}
          />
        </div>
        <input
          type="text"
          className="form-control form-control-sm video-sync-time"
          placeholder="Time"
          value={this.state.video_sync_time_value}
          onChange={this.set_video_sync_time_value}
          onBlur={this.handleKeypressBlur}
          onKeyPress={this.handleKeypressBlur}
          disabled={!this.props.video_sync}
        />
      </React.Fragment>
    );
  }
}

export default ControlsVideo;
