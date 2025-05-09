import React from "react";
import { connect } from 'react-redux';
import { setVariableSelected, } from '../actions';
import { setColormap, } from 'components/actionsColor';
import ControlsDropdown from 'components/ControlsDropdown';
import ControlsGroup from 'components/ControlsGroup';
import ControlsButtonDownloadDataTable from 'components/ControlsButtonDownloadDataTable';
import ControlsDropdownColor from 'components/ControlsDropdownColor';
import slycat_color_maps from "js/slycat-color-maps";

class CCAControlsBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  render() {
    // Define default button style
    const button_style = 'btn-outline-dark';

    return (
      <React.Fragment>
        <React.StrictMode>
          <ControlsGroup id='controls' class='btn-group ms-3'>
            <ControlsDropdown 
              id='color-dropdown' 
              label='Point Color' 
              title='Change Point Color'
              state_label='color_variable' 
              trigger='color-selection-changed'
              items={this.props.color_variables}
              selected={this.props.variable_selected} 
              set_selected={this.props.setVariableSelected} 
              button_style={button_style}
            />
            <ControlsButtonDownloadDataTable 
              selection={this.props.selection} 
              aid={this.props.aid} 
              mid={this.props.mid} 
              model_name={this.props.model_name} 
              metadata={this.props.metadata}
              indices={this.props.indices} 
              button_style={button_style} />
          </ControlsGroup>
          <ControlsGroup id='color-switcher' class='btn-group ms-3'>
            <ControlsDropdownColor 
              button_style={button_style}
              colormaps={slycat_color_maps}
              colormap={this.props.colormap}
              key_id='color-switcher'
              id='color-switcher'
              label='Color'
              title='Change color scheme'
              state_label='color'
              trigger='colormap-changed'
              single={true} 
              setColormap={this.props.setColormap}
            />
          </ControlsGroup>
        </React.StrictMode>
      </React.Fragment>
    );
  }
}

const mapStateToProps = state => {
  return {
    variable_selected: state.variable_selected,
    selection: state.simulations_selected,
    mid: state.derived.model_id,
    metadata: state.derived.table_metadata,
    indices: state.derived.indices,
    model_name: state.derived.model.name,
    colormap: state.colormap,
  }
};

export default connect(
  mapStateToProps,
  { 
    setVariableSelected,
    setColormap,
  }
)(CCAControlsBar)