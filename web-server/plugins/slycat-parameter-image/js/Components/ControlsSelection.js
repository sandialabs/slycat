import * as dialog from "js/slycat-dialog";
import { connect } from "react-redux";
import React from "react";
import _ from "lodash";
import "../../css/controls-selection.css";

class ControlsSelection extends React.PureComponent {
  set_value = (variable, variableIndex, value, alert) => {
    let self = this;

    dialog.prompt({
      title: "Set Values",
      message: "Set values for " + variable + ":",
      value: "",
      alert: alert,
      buttons: [
        { className: "btn-light", label: "Cancel" },
        { className: "btn-primary", label: "Apply" },
      ],
      callback: function (button, valueIn) {
        if (button?.label === "Apply") {
          const userValue = valueIn().trim();
          const numeric = self.props.metadata["column-types"][variableIndex] !== "string";
          const log_scale_type = self.props.axes_variables_scale?.[variableIndex] == "Log";

          // Perform validity checks
          const fails_length_check = userValue.length <= 0;
          const fails_numeric_check = numeric && isNaN(Number(userValue));
          const fails_log_check = log_scale_type && userValue <= 0;
          const valueValid = !fails_length_check && !fails_numeric_check && !fails_log_check;

          if (valueValid) {
            self.props.element.trigger("set-value", {
              selection: self.props.selection,
              variable: variableIndex,
              value: numeric ? userValue : '"' + userValue + '"',
            });
          } else {
            let alertText;
            if (fails_length_check) {
              alertText = "Please enter a value.";
            } else if (fails_numeric_check) {
              alertText = "Please enter a numeric value.";
            } else if (fails_log_check) {
              alertText = "Please enter a value greater than 0.";
            }
            self.set_value(variable, variableIndex, userValue, alertText);
          }
        }
      },
    });
  };

  _is_off_axes = (index) => {
    const x_value = this.props.xValues[index];
    const y_value = this.props.yValues[index];

    // If we don't have an x or y value, the point is off the axes
    if (x_value === undefined || y_value === undefined) {
      return true;
    }

    let custom_axes_ranges = {
      x: {
        min: undefined,
        max: undefined,
      },
      y: {
        min: undefined,
        max: undefined,
      },
    };

    for (const axis of ["x", "y"]) {
      const variableRanges = this.props.variableRanges[this.props[`${axis}_variable`]];
      const customMin = variableRanges != undefined ? variableRanges.min : undefined;
      const customMax = variableRanges != undefined ? variableRanges.max : undefined;
      custom_axes_ranges[axis].min = customMin;
      custom_axes_ranges[axis].max = customMax;
    }

    // console.log(`x: ${x_value}, y: ${y_value}`);

    const off_x_axis = custom_axes_ranges.x.min > x_value || custom_axes_ranges.x.max < x_value;
    const off_y_axis = custom_axes_ranges.y.min > y_value || custom_axes_ranges.y.max < y_value;

    const off_axes = off_x_axis || off_y_axis;
    return off_axes;
  };

  render() {
    // console.log(`ControlsSelection rendered with xValues ${this.props.xValues}`);

    let display_dividers = true;
    let divider = display_dividers ? <div className="dropdown-divider" /> : null;

    let nothing_selected = !this.props.selection.length > 0;
    let rating_variable_controls = this.props.rating_variables.map((rating_variable) => (
      <React.Fragment key={rating_variable}>
        <button
          type="button"
          className={`dropdown-item ${nothing_selected ? "disabled" : ""}`}
          onClick={(e) =>
            this.set_value(this.props.metadata["column-names"][rating_variable], rating_variable, e)
          }
        >
          {this.props.metadata["column-names"][rating_variable]}
        </button>
      </React.Fragment>
    ));

    const all_selected_hidden =
      _.difference(this.props.selection, this.props.hidden_simulations).length === 0;
    const all_selected_visible =
      _.intersection(this.props.selection, this.props.hidden_simulations).length === 0;

    const no_hidden_unselected =
      _.difference(this.props.hidden_simulations, this.props.selection).length === 0;
    const unselected = _.difference(this.props.indices, this.props.selection);
    const no_visible_unselected =
      _.difference(unselected, this.props.hidden_simulations).length === 0;

    // Make an array of all open image indexes
    const open_media_indexes = this.props.open_media.map((media) => media.index);
    // console.log(`open_media_indexes is %o`, open_media_indexes);
    // Make an array of open image indexes for currently selected media column
    const open_current_media_indexes = this.props.open_media
      .filter((media) => media.media_index == this.props.media_index)
      .map((media) => media.index);
    // console.log(`open_current_media_indexes is %o`, open_current_media_indexes);
    const all_open_hidden =
      _.difference(open_media_indexes, this.props.hidden_simulations).length === 0;
    const all_open_selected = _.difference(open_media_indexes, this.props.selection).length === 0;

    // Disable show all button when there are no hidden simulations or when there are active filters
    const show_all_disabled =
      this.props.hidden_simulations.length == 0 || this.props.active_filters.length > 0;
    const show_all_title = show_all_disabled
      ? "There are currently no hidden scatterplot points to show."
      : "Show All Hidden Scatterplot Points";

    const hide_disabled = this.props.active_filters.length > 0 || all_selected_hidden;
    const show_disabled = this.props.active_filters.length > 0 || all_selected_visible;
    const sync_scaling_disabled = false;
    const sync_threeD_colorvar_disabled = false;
    const selected_items_header_disabled =
      hide_disabled && show_disabled && sync_scaling_disabled && sync_threeD_colorvar_disabled;

    const hide_unselected_disabled =
      this.props.active_filters.length > 0 || no_visible_unselected || all_selected_hidden;
    const show_unselected_disabled = this.props.active_filters.length > 0 || no_hidden_unselected;
    const unselected_items_header_disabled = hide_unselected_disabled && show_unselected_disabled;

    // Completely hide the Pin functionality when the model has no media variables to choose from
    const hide_pin = !(this.props.media_columns && this.props.media_columns.length > 0);
    // Disable the Pin function when no media variable is selected
    // or if the current selection only contains hidden simulations
    // of if the current selection is already pinned
    const no_media_variable_selected = !(
      this.props.media_variable && this.props.media_variable >= 0
    );
    const all_selection_hidden =
      _.difference(this.props.selection, this.props.hidden_simulations).length === 0;
    // console.log(`all_selection_hidden is ${all_selection_hidden}`);
    // Check if the current selection for current media column is already pinned.
    const unpinned_selection = _.difference(this.props.selection, open_current_media_indexes);
    // console.log(`unpinned_selection is ${unpinned_selection}`);
    const current_selection_pinned = unpinned_selection.length === 0;
    // console.log(`current_selection_pinned is ${current_selection_pinned}`);
    // Find the unpinned items in the current selection that are visible (i.e, not off axes).
    const unpinned_selection_not_off_axes = unpinned_selection.filter(
      (unpinned_selected_item) => !this._is_off_axes(unpinned_selected_item),
    );
    // console.log(`unpinned_selection_not_off_axes is ${unpinned_selection_not_off_axes}`);
    // Check if entire unpinned selection is off axes, because we will be
    // disabling the "Pin Selected" functionality if this is the case.
    const unpinned_selection_off_axes = unpinned_selection_not_off_axes.length == 0;
    const pin_selected_disabled =
      no_media_variable_selected ||
      all_selection_hidden ||
      current_selection_pinned ||
      unpinned_selection_off_axes;
    const add_pins_to_selection_disabled =
      this.props.open_media.length == 0 || all_open_hidden || all_open_selected;
    // Disabling close all only if there are no open images or all open images are hidden.
    const close_all_disabled = this.props.open_media.length == 0 || all_open_hidden;
    const pins_header_disabled =
      pin_selected_disabled && add_pins_to_selection_disabled && close_all_disabled;

    // Determine when the entire dropdown should be disabled
    const dropdown_disabled =
      show_all_disabled &&
      hide_disabled &&
      pin_selected_disabled &&
      show_disabled &&
      hide_unselected_disabled &&
      show_unselected_disabled &&
      add_pins_to_selection_disabled &&
      close_all_disabled;
    // console.debug(`disabled state variables are: %o`,
    //   {
    //     show_all_disabled: show_all_disabled,
    //     hide_disabled: hide_disabled,
    //     pin_selected_disabled: pin_selected_disabled,
    //     show_disabled: show_disabled,
    //     hide_unselected_disabled: hide_unselected_disabled,
    //     show_unselected_disabled: show_unselected_disabled,
    //     add_pins_to_selection_disabled: add_pins_to_selection_disabled,
    //     close_all_disabled: close_all_disabled,
    //   }
    // );

    return (
      <div className="btn-group">
        <button
          className={`btn btn-sm dropdown-toggle ${this.props.button_style} ${
            dropdown_disabled ? "disabled" : ""
          }`}
          type="button"
          id="selection-dropdown"
          data-toggle="dropdown"
          aria-expanded="false"
          aria-haspopup="true"
          title="Perform Action On Selection"
        >
          Actions
        </button>
        <div id="selection-switcher" className="dropdown-menu" aria-labelledby="selection-dropdown">
          <button
            type="button"
            className={`dropdown-item ${show_all_disabled ? "disabled" : ""}`}
            title={show_all_title}
            onClick={this.props.trigger_show_all}
          >
            Show All Hidden Items
          </button>

          {divider}

          <h6 className={`dropdown-header ${selected_items_header_disabled ? "disabled" : ""}`}>
            Selected Items
          </h6>
          <button
            type="button"
            className={`dropdown-item ${hide_disabled ? "disabled" : ""}`}
            onClick={this.props.trigger_hide_selection}
          >
            Hide
          </button>
          <button
            type="button"
            className={`dropdown-item ${show_disabled ? "disabled" : ""}`}
            onClick={this.props.trigger_show_selection}
          >
            Show
          </button>

          {divider}

          <h6 className={`dropdown-header ${unselected_items_header_disabled ? "disabled" : ""}`}>
            Unselected Items
          </h6>
          <button
            type="button"
            className={`dropdown-item ${hide_unselected_disabled ? "disabled" : ""}`}
            onClick={this.props.trigger_hide_unselected}
          >
            Hide Unselected
          </button>
          <button
            type="button"
            className={`dropdown-item ${show_unselected_disabled ? "disabled" : ""}`}
            onClick={this.props.trigger_show_unselected}
          >
            Show Unselected
          </button>

          {
            /* // Completely hide the Pin functionality when the model has no media variables to choose from */
            !hide_pin && (
              <React.Fragment>
                {divider}

                <h6 className={`dropdown-header ${pins_header_disabled ? "disabled" : ""}`}>
                  Pins
                </h6>
                <button
                  type="button"
                  className={`dropdown-item ${pin_selected_disabled ? "disabled" : ""}`}
                  onClick={this.props.trigger_pin_selection}
                >
                  Pin Selected Items
                </button>
                <button
                  type="button"
                  className={`dropdown-item ${add_pins_to_selection_disabled ? "disabled" : ""}`}
                  onClick={this.props.trigger_select_pinned}
                >
                  Add Pins to Selection
                </button>
                <button
                  type="button"
                  className={`dropdown-item ${close_all_disabled ? "disabled" : ""}`}
                  onClick={this.props.trigger_close_all}
                >
                  Close All Pins
                </button>
                <div className="form-check dropdown-item">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    value=""
                    id="syncScaling"
                    disabled={sync_scaling_disabled}
                    checked={this.props.sync_scaling}
                    onChange={this.props.toggle_sync_scaling}
                  />
                  <label className="form-check-label" htmlFor="syncScaling">
                    Sync Scaling
                  </label>
                </div>
                {/* Disabling this control for now since it is not working yet */}
                {/* <div className="form-check dropdown-item">
            <input className="form-check-input" type="checkbox" value="" id="threeDScaling" 
              disabled={sync_threeD_colorvar_disabled}
              checked={this.props.sync_threeD_colorvar}
              onChange={this.props.toggle_sync_threeD_colorvar}
              />
            <label className="form-check-label" htmlFor="threeDScaling">
              Sync 3D Color Variable
            </label>
          </div> */}
              </React.Fragment>
            )
          }

          {
            /* // Completely hide the Edit functionality when the model has no rating variables */
            this.props.rating_variables.length > 0 && (
              <React.Fragment>
                {divider}

                <h6 className={`dropdown-header ${nothing_selected ? "disabled" : ""}`}>
                  Edit Variable Values
                </h6>
                {rating_variable_controls}
              </React.Fragment>
            )
          }
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  return {
    selection: state.data.selected_simulations,
    hidden_simulations: state.data.hidden_simulations,
    active_filters: state.active_filters,
    sync_threeD_colorvar: state.sync_threeD_colorvar,
    variableRanges: state.variableRanges,
    open_media: state.open_media,
    media_index: state.media_index,
    xValues: state.derived.xValues,
    yValues: state.derived.yValues,
    axes_variables_scale: state.axesVariables,
  };
};

export default connect(mapStateToProps, {})(ControlsSelection);
