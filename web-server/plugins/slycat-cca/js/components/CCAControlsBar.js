import React from "react";
import { Provider } from 'react-redux';
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
          <ControlsGroup id="controls" class="btn-group ml-3">
            <ControlsDropdown 
              id="color-dropdown" 
              label="Point Color" 
              title="Change Point Color"
              state_label="color_variable" 
              trigger="color-selection-changed"
              items={this.props.color_variables}
              selected={this.props.color_variable} 
              set_selected={this.set_selected} 
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
          <ControlsGroup id="color-switcher" class="btn-group ml-3">
            <ControlsDropdownColor
              element={self.element}
              dropdown={this.props.dropdown_color}
              selection={this.props.selection_color}
            />
          </ControlsGroup>
        </React.StrictMode>
      </React.Fragment>
    );
  }
}

export default CCAControlsBar