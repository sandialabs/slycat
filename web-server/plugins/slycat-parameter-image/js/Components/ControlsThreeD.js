import React from "react";
import ControlsGroup from 'components/ControlsGroup';
import ControlsButtonToggle from "./ControlsButtonToggle";
import ControlsDropdown from './ControlsDropdown';
import vtkColorMaps from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction/ColorMaps';
import { faCubes } from '@fortawesome/free-solid-svg-icons'

class ControlsThreeD extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let color_map_items = vtkColorMaps.rgbPresetNames.map((name) => { 
      return {key: name, name: name,} 
    });

    return !this.props.any_threeD_open ? null : (
      <React.Fragment>
        <ControlsButtonToggle 
          title={this.props.threeD_sync ? 'Unsync 3D Viewers' : 'Sync 3D Viewers'} 
          icon={faCubes}
          active={this.props.threeD_sync} 
          set_active_state={this.props.set_threeD_sync} 
          button_style={this.props.button_style}
        />
        <ControlsDropdown 
          key="threeD-color-dropdown"
          id="threeD-color-dropdown" 
          label="3D Color"
          title="Change 3D color"
          state_label="threeD_color"
          trigger="threeD-color-selection-changed"
          items={color_map_items}
          // selected={this.state.selection} 
          // single={this.props.dropdown[0].single} 
          // set_selected={this.set_selected}
          button_style={this.props.button_style}
        />
      </React.Fragment>
    );
  }
}

export default ControlsThreeD