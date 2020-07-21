import React from "react";
import { connect } from 'react-redux';
import { setColormap, } from 'components/actionsColor';
import ControlsDropdown from 'components/ControlsDropdown';

export default class ControlsDropdownColor extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const colormaps = this.props.colormaps.color_maps;
    const items = Object.keys(colormaps).map((key, index) => {
      let colormap = colormaps[key];

      // Create CSS styles for rendering a preview of each colomap in the dropdown
      let gradient_data = this.props.colormaps.get_gradient_data(key);
      let color_stops = [];
      for (var i = 0; i < gradient_data.length; i++) {
          color_stops.push(gradient_data[i].color + " "
              + gradient_data[i].offset + "%");
      }
      let background_color = colormap.background;
      let style = {
        backgroundImage: "linear-gradient(to bottom, "
            + color_stops.join(", ") + "), linear-gradient(to bottom, "
            + background_color + ", " + background_color + ")",
        backgroundSize: "5px 75%, 50px 100%",
        backgroundPosition: "right 10px center, right 5px center",
        backgroundRepeat: "no-repeat, no-repeat",
        paddingRight: "70px",
      }

      return {
        key: key,
        name: colormap.label,
        style: style,
      }
    });

    return (
      <ControlsDropdown 
        key={this.props.key_id}
        id={this.props.id}
        label={this.props.label}
        title={this.props.title}
        state_label={this.props.state_label}
        trigger={this.props.trigger}
        items={items}
        selected={this.props.colormap} 
        single={this.props.single}
        set_selected={this.props.setColormap}
        button_style={this.props.button_style}
      />
    );
  }
}
