import React from "react";
import { connect } from 'react-redux';
import { changeThreeDColormap } from '../actions';
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
          key='threeD-color-dropdown'
          id='threeD-color-dropdown' 
          label='3D Color'
          title='Change 3D color'
          state_label='threeD_color'
          trigger='threeD-color-selection-changed'
          items={color_map_items}
          selected={this.props.threeDColormap} 
          // single={this.props.dropdown[0].single} 
          set_selected={this.props.changeThreeDColormap}
          button_style={this.props.button_style}
        />
      </React.Fragment>
    );
  }
}

const mapStateToProps = state => {
  return {
    threeDColormap: state.threeDColormap,
    // mid: state.derived.model_id,
    // inputs: state.derived.input_columns,
    // outputs: state.derived.output_columns,
    // others: state.derived.other_columns,
    // metadata: state.derived.table_metadata,
    // row_selection: state.simulations_selected,
    // colormap: slycat_color_maps.get_color_scale(state.colormap),
    // sort_variable: state.variable_sorted,
    // sort_order: state.variable_sort_direction,
    // variable_selection: state.variable_selected,
    // width: state.derived.table_width,
    // height: state.derived.table_height,
  }
};

export default connect(
  mapStateToProps,
  { 
    changeThreeDColormap,
    // setVariableSelected,
    // setVariableSorted,
    // setSimulationsSelected,
  }
)(ControlsThreeD)