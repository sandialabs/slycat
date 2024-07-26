import React from "react";
// @ts-ignore
import ControlsDropdown from "components/ControlsDropdown";
import ColorMaps from "js/slycat-color-maps";
import d3 from "d3";

interface ControlsDropdownColorProps {
  colormaps: typeof ColorMaps;
  colormap: string;
  key_id: string;
  id: string;
  label: string;
  title: string;
  state_label: string;
  trigger: string;
  single: boolean;
  button_style: string;
  setColormap(colormap: string): void;
  background?: d3.RGBColor;
}

/**
 * React component used to create a dropdown for selecting a color scheme.
 *
 *
 * @export
 * @class ControlsDropdownColor
 * @extends {React.Component<ControlsDropdownColorProps>}
 */
export default class ControlsDropdownColor extends React.Component<ControlsDropdownColorProps> {
  constructor(props: ControlsDropdownColorProps) {
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
        color_stops.push(gradient_data[i].color + " " + gradient_data[i].offset + "%");
      }
      let background_color = colormap.background;
      if (background_color === undefined) {
        background_color = this.props.background ? this.props.background : d3.rgb(255, 255, 255);
      }
      const width = 250;
      const right_margin = 5;
      const left_margin = 5;
      const right_left_padding = 10;
      const background_width = width - right_margin - left_margin - 2 * right_left_padding;
      const gradient_width = background_width - 2 * right_left_padding;
      let style = {
        backgroundImage:
          "linear-gradient(to left, " +
          color_stops.join(", ") +
          "), linear-gradient(to bottom, " +
          background_color +
          ", " +
          background_color +
          ")",
        backgroundSize: `${gradient_width}px 55%, ${background_width}px 100%`,
        backgroundPosition: `right ${
          right_margin + right_left_padding
        }px center, right ${right_margin}px center`,
        backgroundRepeat: "no-repeat, no-repeat",
        paddingRight: `${width}px`,
      };

      return {
        key: key,
        name: colormap.label,
        style: style,
      };
    });

    return (
      <ControlsDropdown
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
