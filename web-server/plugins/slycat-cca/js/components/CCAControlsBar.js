import React from "react";
import { connect } from 'react-redux';
import { setVariableSelected, } from '../actions';
import ControlsDropdown from 'components/ControlsDropdown';
import ControlsGroup from 'components/ControlsGroup';
import ControlsButtonDownloadDataTable from 'components/ControlsButtonDownloadDataTable';
import ControlsDropdownColor from 'components/ControlsDropdownColor';

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
          <ControlsGroup id='controls' class='btn-group ml-3'>
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
          <ControlsGroup id='color-switcher' class='btn-group ml-3'>
            <ControlsDropdownColor 
              button_style={button_style}
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
  }
};

export default connect(
  mapStateToProps,
  { 
    setVariableSelected,
  }
)(CCAControlsBar)