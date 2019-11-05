import React from "react";
import ControlsButtonToggle from "./controls-button-toggle";

class ControlsThreeD extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return !this.props.any_threeD_open ? null : (
      <React.Fragment>
        {/* div.input-group-prepend should be enabled only when there is more than a single control present here */}
        {/* <div className='input-group-prepend'> */}
          <ControlsButtonToggle title={this.props.threeD_sync ? 'Unsync 3D Viewers' : 'Sync 3D Viewers'} icon='fa-rotate-right' 
            active={this.props.threeD_sync} set_active_state={this.props.set_threeD_sync} button_style={this.props.button_style}
          />
        {/* </div> */}
      </React.Fragment>
    );
  }
}

export default ControlsThreeD