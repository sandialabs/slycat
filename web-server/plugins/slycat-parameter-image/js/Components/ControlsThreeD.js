import React from "react";
import { connect } from 'react-redux';
import { changeThreeDColormap, updateThreeDColorBy } from '../actions';
import ControlsGroup from 'components/ControlsGroup';
import ControlsButtonToggle from "./ControlsButtonToggle";
import ControlsDropdown from './ControlsDropdown';
import vtkColorMaps from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction/ColorMaps';
import { faCubes } from '@fortawesome/free-solid-svg-icons'

class ControlsThreeD extends React.Component {
  constructor(props) {
    super(props);
  }

  changeThreeDColorBy = (label, key) => {
    this.props.updateThreeDColorBy(this.props.currentFrame, key);
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
          key='threeD-color-dropdown'
          id='threeD-color-dropdown' 
          label='3D Color'
          title='Change 3D color'
          state_label='threeD_color'
          items={color_map_items}
          selected={this.props.threeDColormap} 
          single={false} 
          set_selected={this.props.changeThreeDColormap}
          button_style={this.props.button_style}
        />
        { this.props.color_by_items &&
        <ControlsDropdown 
          key='threeD-colorBy-dropdown'
          id='threeD-colorBy-dropdown' 
          label='Color By'
          title='Change 3D color by'
          state_label='threeD_colorBy'
          items={this.props.color_by_items}
          selected={this.props.threeDColorBy} 
          single={false} 
          set_selected={this.changeThreeDColorBy}
          button_style={this.props.button_style}
        />
        }
      </React.Fragment>
    );
  }
}

const mapStateToProps = state => {
  let color_by_items;
  // Only create color by items if we have color by options
  // and we have a frame currently selected
  // and we have color by options for that frame
  if(
    state.derived.three_d_colorby_options 
    && state.currentFrame 
    && state.derived.three_d_colorby_options[state.currentFrame] 
  )
  {
    color_by_items = state.derived.three_d_colorby_options[state.currentFrame].map(
      (option) => {
        return {
          key: option.value, 
          name: option.label
        }
    });
  }

  let threeDColorBy;
  if(state.three_d_colorvars)
  {
    threeDColorBy = state.three_d_colorvars[state.currentFrame];
  }
  
  return {
    threeDColormap: state.threeDColormap,
    color_by_items: color_by_items,
    currentFrame: state.currentFrame,
    threeDColorBy: threeDColorBy,
  }
};

export default connect(
  mapStateToProps,
  { 
    changeThreeDColormap,
    updateThreeDColorBy,
  }
)(ControlsThreeD)