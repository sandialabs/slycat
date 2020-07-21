import React from "react";
import { connect } from "react-redux";
import { changeThreeDColormap, updateThreeDColorBy } from "../actions";
import ControlsGroup from "components/ControlsGroup";
import ControlsButtonToggle from "./ControlsButtonToggle";
import ControlsDropdown from "./ControlsDropdown";
import { faCubes } from "@fortawesome/free-solid-svg-icons";
import ControlsDropdownColor from 'components/ControlsDropdownColor';
import slycat_threeD_color_maps from "js/slycat-threeD-color-maps";

class ControlsThreeD extends React.Component {
  constructor(props) {
    super(props);
  }

  changeThreeDColorBy = (label, key) => {
    this.props.updateThreeDColorBy(this.props.currentFrame, key);
  };

  render() {
    // Only show Color By control if we have more than 1 item in it,
    // otherwise there's nothing to choose between.
    let showColorBy = this.props.color_by_items && this.props.color_by_items.length > 1;

    return !this.props.any_threeD_open ? null : (
      <React.Fragment>
        <ControlsButtonToggle
          title={this.props.threeD_sync ? "Unsync 3D Viewers" : "Sync 3D Viewers"}
          icon={faCubes}
          active={this.props.threeD_sync}
          set_active_state={this.props.set_threeD_sync}
          button_style={this.props.button_style}
        />
        <ControlsDropdownColor 
          button_style={this.props.button_style}
          colormaps={slycat_threeD_color_maps}
          colormap={this.props.threeDColormap}
          key_id='threeD-color-dropdown'
          id='threeD-color-dropdown'
          label='3D Color'
          title='Change 3D color'
          state_label='threeD_color'
          single={false} 
          setColormap={this.props.changeThreeDColormap}
        />
        {showColorBy && (
          <ControlsDropdown
            button_style={this.props.button_style}
            key_id="threeD-colorBy-dropdown"
            id="threeD-colorBy-dropdown"
            label="Color By"
            title="Change 3D color by"
            state_label="threeD_colorBy"
            items={this.props.color_by_items}
            selected={this.props.threeDColorBy}
            single={false}
            set_selected={this.changeThreeDColorBy}
          />
        )}
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state) => {
  let color_by_items;
  // Only create color by items if we have color by options
  // and we have a frame currently selected
  // and we have color by options for that frame
  if (
    state.derived.three_d_colorby_options &&
    state.currentFrame &&
    state.derived.three_d_colorby_options[state.currentFrame]
  ) {
    // Sort Color By options.
    // List points data first, then cell data.
    // Within each, list the items alphabetically.
    color_by_items = state.derived.three_d_colorby_options[state.currentFrame];
    // Compare using English locale
    const locale = "en";
    // Make it case and accent insensitive.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Collator/Collator
    const options = { sensitivity: "base" };

    color_by_items.sort(function (a, b) {
      if (a.type && b.type) {
        return (
          b.type.localeCompare(a.type, locale, options) ||
          a.label.localeCompare(b.label, locale, options)
        );
      }
    });

    color_by_items = color_by_items.flatMap((option, index, array) => {
      let item = [];
      item.push({
        key: option.value,
        name: option.label,
      });

      // If there's more than 1 component, add a menu item for each
      if (option.components > 1) {
        [...Array(option.components)].map((component, componentIndex) => {
          item.push({
            key: `${option.value}:${componentIndex}`,
            // Adding 2 non-breaking space characters before the bullet.
            // Opt + Space on macOS. Please do not replace with plain
            // spaces because they will dissapear during rendering and the component
            // bullets will not be indented.
            name: `  • Component ${componentIndex + 1}`,
          });
        });
      }

      // Add a separator and header label if we have a next option
      // and its type is different than the current option's type
      if (array[index + 1] && option.type != array[index + 1].type) {
        item.push({ type: "divider" });
        item.push({ type: "header", name: array[index + 1].type });
      }
      return item;
    });
  }

  let threeDColorBy;
  if (state.three_d_colorvars) {
    threeDColorBy = state.three_d_colorvars[state.currentFrame];
  }

  return {
    threeDColormap: state.threeDColormap,
    color_by_items: color_by_items,
    currentFrame: state.currentFrame,
    threeDColorBy: threeDColorBy,
  };
};

export default connect(mapStateToProps, {
  changeThreeDColormap,
  updateThreeDColorBy,
})(ControlsThreeD);
