import React, { Component } from "react";
import ControlsDropdown from "./controls-dropdown";

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

  export default ControlsPlayback;