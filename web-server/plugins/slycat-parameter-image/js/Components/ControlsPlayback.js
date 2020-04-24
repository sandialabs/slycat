import React from "react";
import ControlsButton from "components/ControlsButton";

const ControlsPlayback = (props) => {
    return !props.any_video_open ? null : (
      <div className='input-group-append'>
        <ControlsButton title='Jump to beginning' icon='fa-fast-backward' 
          button_style={props.button_style} 
          disabled={props.disabled} 
          click={props.trigger_jump_to_start} 
        />
        <ControlsButton title='Skip one frame back' icon='fa-backward' 
          button_style={props.button_style} 
          disabled={props.disabled} 
          click={props.trigger_frame_back} 
        />
        <ControlsButton title='Play' icon='fa-play' 
          button_style={props.button_style} 
          class='play-button'
          hidden={props.playing} 
          disabled={props.disabled} 
          click={props.trigger_play} 
        />
        <ControlsButton title='Pause' icon='fa-pause' 
          button_style={props.button_style} 
          class='pause-button'
          hidden={!props.playing} 
          disabled={props.disabled} 
          click={props.trigger_pause} 
        />
        <ControlsButton title='Skip one frame forward' icon='fa-forward' 
          button_style={props.button_style} 
          disabled={props.disabled} 
          click={props.trigger_frame_forward} 
        />
        <ControlsButton title='Jump to end' icon='fa-fast-forward' 
          button_style={props.button_style} 
          disabled={props.disabled} 
          click={props.trigger_jump_to_end} 
        />
      </div>
    );
};

export default ControlsPlayback;