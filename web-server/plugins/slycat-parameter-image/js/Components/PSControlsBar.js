import React from "react";
import { Provider, connect } from "react-redux";
import ControlsPlayback from "./ControlsPlayback";
import ControlsDropdown from "components/ControlsDropdown";
import ControlsVideo from "./ControlsVideo";
import ControlsThreeD from "./ControlsThreeD";
import ControlsSelection from "./ControlsSelection";
import ControlsGroup from "components/ControlsGroup";
import ControlsButtonToggle from "./ControlsButtonToggle";
import ControlsButtonUpdateTable from "./ControlsButtonUpdateTable.jsx";
import ControlsButtonDownloadDataTable from "components/ControlsButtonDownloadDataTable";
import ControlsButtonVarOptions from "./ControlsButtonVarOptions";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import _ from "lodash";
import $ from "jquery";
import {
  toggleSyncScaling,
  toggleSyncThreeDColorvar,
  setVideoSyncTime,
  setColormap,
} from "../actions";
import ControlsDropdownColor from "components/ControlsDropdownColor";
import slycat_color_maps from "js/slycat-color-maps";
import { v4 as uuidv4 } from "uuid";
import { toggleShowHistogram, toggleAutoScale } from "../scatterplotSlice";

class ControlsBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      video_sync: this.props.video_sync,
      var_settings: this.props.var_settings,
    };
    this.scatterplot_id = "scatterplot-controls";
    this.selection_id = "selection-controls";
    this.autoScaleId = "auto-scale";
    this.autoScalePopoverSelector = `#${this.selection_id} #auto-scale`;
  }

  button_style_auto_scale = "";

  componentDidMount() {
    this.setAutoScaleTooptip();
  }

  componentDidUpdate() {
    this.setAutoScaleTooptip();
  }

  setAutoScaleTooptip = () => {
    // console.log(`Initializing popover tooltips. Used for auto scale button.`);

    const status = this.props.auto_scale;
    const status_text = status ? "On" : "Off";
    let content_text = "Auto scale is disabled. Click to turn it on.";
    let content_class = "";
    this.button_style_auto_scale = "";

    if (status) {
      // Find any currently active axes limits
      let active_axes_limits = [];

      for (const axis of ["x", "y", "v"]) {
        const variableRanges = this.props.variableRanges[this.props[`${axis}_index`]];
        if (variableRanges !== undefined) {
          for (const direction of ["min", "max"]) {
            if (variableRanges.hasOwnProperty(direction)) {
              active_axes_limits.push({
                axis: axis,
                direction: direction,
                value: variableRanges[direction],
              });
            }
          }
        }
      }

      const enabled_for_all_axes = active_axes_limits.length === 0;

      this.button_style_auto_scale = enabled_for_all_axes ? "" : "text-warning";

      content_text = enabled_for_all_axes
        ? "Auto scale is enabled for all current axes."
        : "Variable ranges are overriding auto scale:";

      for (const limit of active_axes_limits) {
        const axis = limit.axis == "v" ? "Point color" : `${limit.axis.toUpperCase()} axis`;
        content_text += `
          <br />
          &bull; ${axis} ${limit.direction} is set to ${limit.value}
        `;
      }

      content_class = enabled_for_all_axes ? "" : "bg-warning";
    }

    $(this.autoScalePopoverSelector).popover("dispose");
    $(this.autoScalePopoverSelector).popover({
      // Specifying custom popover template to make text red by adding text-danger class.
      template: `
        <div class="popover" role="tooltip">
          <div class="arrow"></div>
          <h3 class="popover-header"></h3>
          <div class="popover-body ${content_class}"></div>
        </div>`,
      placement: "bottom",
      trigger: "hover",
      title: `Auto Scale ${status_text}`,
      content: content_text,
      html: true,
    });
    // Open the popover immediately if the cursor is already over the button
    if ($(`${this.autoScalePopoverSelector}:hover`).length != 0) {
      $(this.autoScalePopoverSelector).popover("show");
    }
  };

  set_selected = (key, state_label, trigger, e, props) => {
    // This is the legacy way of letting the rest of non-React components that the state changed. Remove once we are converted to React.
    this.props.element.trigger(trigger, key);
  };

  set_auto_scale = (e) => {
    this.props.toggleAutoScale();
  };

  set_video_sync = (e) => {
    this.setState((prevState, props) => {
      const new_video_sync = !prevState.video_sync;
      this.props.element.trigger("video-sync", new_video_sync);
      return { video_sync: new_video_sync };
    });
  };

  set_video_sync_time = (value) => {
    this.props.setVideoSyncTime(value);
    this.props.element.trigger("video-sync-time", value);
  };

  trigger_show_all = (e) => {
    this.props.element.trigger("show-all");
  };

  trigger_close_all = (e) => {
    this.props.element.trigger("close-all");
  };

  trigger_hide_selection = (e) => {
    if (this.props.active_filters.length == 0) {
      this.props.element.trigger("hide-selection", this.props.selected_simulations);
    }
    // The to prevent the drop-down from closing when clicking on a disabled item
    // Unfortunately none of these work to stop the drop-down from closing. Looks like bootstrap's event is fired before this one.
    // else {
    //   e.nativeEvent.stopImmediatePropagation();
    //   e.preventDefault();
    //   e.stopPropagation();
    //   return false;
    // }
  };

  trigger_hide_unselected = (e) => {
    if (this.props.active_filters.length == 0) {
      // As of jQuery 1.6.2, single string or numeric argument can be passed without being wrapped in an array.
      // https://api.jquery.com/trigger/
      // Thus we need to wrap our selection array in another array to pass it.
      this.props.element.trigger("hide-unselected", [this.props.selected_simulations]);
    }
  };

  trigger_show_unselected = (e) => {
    if (this.props.active_filters.length == 0) {
      this.props.element.trigger("show-unselected", [this.props.selected_simulations]);
    }
  };

  trigger_show_selection = (e) => {
    if (this.props.active_filters.length == 0) {
      this.props.element.trigger("show-selection", [this.props.selected_simulations]);
    }
  };

  trigger_pin_selection = (e) => {
    // Passing true along with selection to pin-selection trigger to make it restore the size
    // and location of pins. We only do this when pinning from the controls menu, per
    // https://github.com/sandialabs/slycat/issues/1043#issuecomment-954137333
    this.props.element.trigger("pin-selection", [this.props.selected_simulations, true]);
  };

  trigger_select_pinned = (e) => {
    this.props.element.trigger("select-pinned", [this.props.open_media]);
  };

  trigger_jump_to_start = (e) => {
    this.props.element.trigger("jump-to-start");
  };

  trigger_frame_back = (e) => {
    this.props.element.trigger("frame-back");
  };

  trigger_play = (e) => {
    this.props.element.trigger("play");
  };

  trigger_pause = (e) => {
    this.props.element.trigger("pause");
  };

  trigger_frame_forward = (e) => {
    this.props.element.trigger("frame-forward");
  };

  trigger_jump_to_end = (e) => {
    this.props.element.trigger("jump-to-end");
  };

  get_variable_label(variable) {
    if (this.props.variable_aliases[variable] !== undefined) {
      return this.props.variable_aliases[variable];
    }

    return this.props.metadata["column-names"][variable];
  }

  render() {
    // Define default button style
    const button_style = "btn-outline-dark";

    // Update dropdowns with variable aliases when they exist
    const aliased_dropdowns = _.cloneDeep(this.props.dropdowns).map((dropdown) => {
      dropdown.items = dropdown.items.map((item) => {
        // Don't try to update variable names for keys less than 0, because those are not
        // real variables. For example, the "None" first item in the Media Set dropdown.
        if (item.key >= 0) {
          item.name = this.get_variable_label(item.key);
        }
        return item;
      });
      return dropdown;
    });

    // If we have xy_pairs, move them to the bottom of the x and y dropdowns
    if (this.props.xy_pairs_items.length > 0) {
      const move_xy_pairs = (items) => {
        items.push({ type: "divider" });
        items.push({ type: "header", name: "XY Pair" });
        this.props.xy_pairs_indexes.forEach((index) => {
          const items_index = _.findIndex(items, { key: index });
          items.push(items.splice(items_index, 1)[0]);
        });
      };

      let x_items = _.find(aliased_dropdowns, { id: "x-axis-dropdown" }).items;
      let y_items = _.find(aliased_dropdowns, { id: "y-axis-dropdown" }).items;
      move_xy_pairs(x_items);
      move_xy_pairs(y_items);
    }

    const dropdowns = aliased_dropdowns.map((dropdown) => {
      if (dropdown.items.length > 1) {
        // If this dropdown is the y-axis-dropdown
        if (dropdown.id == "y-axis-dropdown") {
          // If show_histogram is true
          if (this.props.show_histogram) {
            // Iterate through each item in the dropdown
            dropdown.items.forEach((item) => {
              // If the item is not a divider or header
              if (item.type != "divider" && item.type != "header") {
                // Deselect it because we are showing the histogram, which displays a different y axis
                item.selected = false;
              }
            });
          }
          // Add a separator and an item to display the histogram
          const unique_histogram_dropdown_item_key = uuidv4();
          dropdown.items.push(
            {
              type: "divider",
            },
            {
              // key is a unique identifier to make sure it doesn't clash with any other dropdown items
              key: unique_histogram_dropdown_item_key,
              name: "Frequency of X Axis Variable",
              set_selected: this.props.toggleShowHistogram,
              selected: this.props.show_histogram,
            },
          );
        }

        return (
          <ControlsDropdown
            button_style={button_style}
            key={dropdown.id}
            id={dropdown.id}
            label={dropdown.label}
            title={dropdown.title}
            items={dropdown.items}
            state_label={dropdown.state_label}
            trigger={dropdown.trigger}
            selected={this.props[dropdown.state_label]}
            set_selected={this.set_selected}
            dispatch={dropdown.dispatch}
          />
        );
      } else {
        return false;
      }
    });

    // Video and playback controls
    let any_video_open = false;
    let any_video_playing = false;
    let current_frame_video = false;
    let current_frame_video_playing = false;
    for (let open_media of this.props.open_media) {
      if (open_media.video) {
        any_video_open = true;
        if (open_media.current_frame) {
          current_frame_video = true;
          if (open_media.playing) {
            current_frame_video_playing = true;
            any_video_playing = true;
            break;
          }
        }
        if (open_media.playing) {
          any_video_playing = true;
        }
      }
      // No need to keep searching if we found a video and the current frame is also a video
      if (
        any_video_open &&
        current_frame_video &&
        any_video_playing &&
        current_frame_video_playing
      ) {
        break;
      }
    }
    // Disable playback controls when the current frame is not a video and sync videos is not toggled
    const disabled_playback = !(this.state.video_sync || current_frame_video);
    // Track if any video is playing when sync is on or if the current video is playing if sync is off
    // This is used to decide if the play or the pause button is visible in the playback controls
    const playing =
      (this.state.video_sync && any_video_playing) ||
      (!this.state.video_sync && current_frame_video_playing);

    // 3D controls
    let any_threeD_open = false;
    let current_frame_threeD = false;
    for (let open_media of this.props.open_media) {
      if (open_media.threeD) {
        any_threeD_open = true;
        if (open_media.current_frame) {
          current_frame_threeD = true;
        }
      }
      // No need to keep searching if we found a video and the current frame is also a video
      if (any_threeD_open && current_frame_threeD) {
        break;
      }
    }

    return (
      <Provider store={window.store}>
        <React.Fragment>
          <React.StrictMode>
            <ControlsGroup id={this.scatterplot_id} class="btn-group ml-3">
              {this.props.xy_pairs_items.length > 0 && (
                <ControlsDropdown
                  key="xypair-dropdown"
                  id="xypair-dropdown"
                  label="XY Pair"
                  title="Change XY Pair Variables"
                  state_label="xypair_variables"
                  trigger="xypair_selection_changed"
                  items={this.props.xy_pairs_items}
                  selected={this.props.xy_pair_selected}
                  set_selected={(key, state_label, trigger, e) =>
                    this.props.element.trigger(trigger, key)
                  }
                  button_style={button_style}
                />
              )}
              {dropdowns}
              <ControlsButtonVarOptions
                model={this.props.model}
                metadata={this.props.metadata}
                axes_variables={this.props.axes_variables}
                button_style={button_style}
                element={this.props.element}
              />
            </ControlsGroup>
            <ControlsGroup id={this.selection_id} class="btn-group ml-3">
              <ControlsButtonToggle
                icon={faExternalLinkAlt}
                active={this.props.auto_scale}
                set_active_state={this.set_auto_scale}
                button_style={`${button_style} ${this.button_style_auto_scale}`}
                id={this.autoScaleId}
              />
              <ControlsSelection
                trigger_hide_selection={this.trigger_hide_selection}
                trigger_hide_unselected={this.trigger_hide_unselected}
                trigger_show_unselected={this.trigger_show_unselected}
                trigger_show_selection={this.trigger_show_selection}
                sync_scaling={this.props.sync_scaling}
                toggle_sync_scaling={this.props.toggleSyncScaling}
                toggle_sync_threeD_colorvar={this.props.toggleSyncThreeDColorvar}
                trigger_pin_selection={this.trigger_pin_selection}
                trigger_close_all={this.trigger_close_all}
                trigger_show_all={this.trigger_show_all}
                trigger_select_pinned={this.trigger_select_pinned}
                indices={this.props.indices}
                rating_variables={this.props.rating_variables}
                metadata={this.props.metadata}
                element={this.props.element}
                button_style={button_style}
                media_columns={this.props.media_columns}
                media_variable={this.props.media_index}
              />
              <ControlsButtonDownloadDataTable
                selection={this.props.selected_simulations}
                hidden_simulations={this.props.hidden_simulations}
                aid={this.props.aid}
                mid={this.props.mid}
                model_name={this.props.model_name}
                metadata={this.props.metadata}
                indices={this.props.indices}
                button_style={button_style}
              />
              <ControlsButtonUpdateTable
                button_style={button_style}
                mid={this.props.mid}
                pid={this.props.pid}
                aliases={this.props.variable_aliases}
              />
            </ControlsGroup>
            {any_video_open && (
              <ControlsGroup
                id="video-controls"
                class="input-group input-group-sm ml-3 playback-controls"
              >
                <ControlsVideo
                  video_sync={this.state.video_sync}
                  set_video_sync={this.set_video_sync}
                  video_sync_time={this.props.video_sync_time}
                  set_video_sync_time={this.set_video_sync_time}
                  any_video_open={any_video_open}
                  button_style={button_style}
                />
                <ControlsPlayback
                  trigger_jump_to_start={this.trigger_jump_to_start}
                  trigger_frame_back={this.trigger_frame_back}
                  trigger_play={this.trigger_play}
                  trigger_pause={this.trigger_pause}
                  trigger_frame_forward={this.trigger_frame_forward}
                  trigger_jump_to_end={this.trigger_jump_to_end}
                  any_video_open={any_video_open}
                  disabled={disabled_playback}
                  playing={playing}
                  button_style={button_style}
                />
              </ControlsGroup>
            )}
            {any_threeD_open && (
              <ControlsGroup id="threeD-controls" class="btn-group ml-3">
                <ControlsThreeD
                  any_threeD_open={any_threeD_open}
                  button_style={button_style}
                  element={this.props.element}
                />
              </ControlsGroup>
            )}
            <ControlsGroup id="color-switcher" class="btn-group ml-3">
              <ControlsDropdownColor
                button_style={button_style}
                colormaps={slycat_color_maps}
                colormap={this.props.colormap}
                key_id="color-switcher"
                id="color-switcher"
                label="Color"
                title="Change color scheme"
                state_label="color"
                trigger="colormap-changed"
                single={true}
                setColormap={this.props.setColormap}
              />
            </ControlsGroup>
          </React.StrictMode>
        </React.Fragment>
      </Provider>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  let xy_pairs_indexes = [];
  let xy_pairs_items = [];
  state.derived.xy_pairs.forEach((xy_pair) => {
    xy_pairs_indexes.push(xy_pair.x);
    xy_pairs_indexes.push(xy_pair.y);
    xy_pairs_items.push({
      // keys need to be a string, so stingify'ing here and parsing later when we need to get at data
      key: JSON.stringify({ x: xy_pair.x, y: xy_pair.y }),
      name: xy_pair.label,
    });
  });
  const xy_pair_selected = JSON.stringify({ x: state.x_index, y: state.y_index });

  return {
    variableRanges: state.variableRanges,
    x_index: state.x_index,
    y_index: state.y_index,
    v_index: state.v_index,
    media_index: state.media_index,
    media_columns: state.derived.media_columns,
    open_media: state.open_media,
    variable_aliases: state.derived.variableAliases,
    active_filters: state.active_filters,
    sync_scaling: state.sync_scaling,
    selected_simulations: state.data.selected_simulations,
    xy_pairs_items: xy_pairs_items,
    xy_pairs_indexes: xy_pairs_indexes,
    xy_pair_selected: xy_pair_selected,
    hidden_simulations: state.data.hidden_simulations,
    video_sync_time: state.video_sync_time,
    colormap: state.colormap,
    show_histogram: state.scatterplot.show_histogram,
    auto_scale: state.scatterplot.auto_scale,
  };
};

export default connect(
  mapStateToProps,
  {
    toggleSyncScaling,
    toggleSyncThreeDColorvar,
    setVideoSyncTime,
    setColormap,
    toggleShowHistogram,
    toggleAutoScale,
  },
  null,
  // Before fully convering to React and Redux, we need a reference to this
  // ControlsBar component so we can set its state from outside React. This option makes it so that
  // adding a ref to the connected wrapper component will actually return the instance of the wrapped component.
  // https://react-redux.js.org/api/connect#forwardref-boolean
  { forwardRef: true },
)(ControlsBar);
