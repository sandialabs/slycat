import * as dialog from "js/slycat-dialog";
import React from "react";
import _ from "lodash";

class ControlsSelection extends React.PureComponent {

  set_value = (variable, variableIndex, value, alert) => {
    dialog.prompt({
      title: "Set Values",
      message: "Set values for " + variable + ":",
      value: '',
      alert: alert,
      buttons: [
        {className: "btn-light", label:"Cancel"},
        {className: "btn-primary", label:"Apply"}
      ],
      callback: function(button, valueIn)
      {
        if(button.label === "Apply")
        {
          let userValue = valueIn().trim();
          let numeric = this.props.metadata["column-types"][variableIndex] !== "string";
          let valueValid = userValue.length > 0;
          if( valueValid && numeric && isNaN(Number(userValue)) ) {
            valueValid = false;
          }
          if(valueValid) {
            this.props.element.trigger("set-value", {
              selection : this.props.selection,
              variable : variableIndex,
              value : numeric ? userValue : '"' + userValue + '"',
            });
          } else {
            let alertText = "Please enter a value.";
            if(numeric)
            {
              alertText = "Please enter a numeric value.";
            }
            set_value(variable, variableIndex, userValue, alertText);
          }
        }
      },
    });
  }

  _is_off_axes = (index) => {
    const x_value = self.options.x[index];
    const y_value = self.options.y[index];

    // console.log(`x: ${x_value}, y: ${y_value}`);

    const off_x_axis = self.custom_axes_ranges.x.min > x_value || self.custom_axes_ranges.x.max < x_value;
    const off_y_axis = self.custom_axes_ranges.y.min > y_value || self.custom_axes_ranges.y.max < y_value;

    const off_axes = off_x_axis || off_y_axis;
    return off_axes;
  }
  
  render() {
    // console.log(`ControlsSelection rendered`);
  
    let display_dividers = true;
    let divider = display_dividers ? (<div className='dropdown-divider' />) : null;
  
    let nothing_selected = !this.props.selection.length > 0;
    let rating_variable_controls = this.props.rating_variables.map((rating_variable) => (
      <React.Fragment key={rating_variable}>
        <a href='#' 
          className={`dropdown-item ${nothing_selected ? 'disabled' : ''}`}
          onClick={(e) => set_value(this.props.metadata['column-names'][rating_variable], rating_variable, e)}>
          {this.props.metadata['column-names'][rating_variable]}
        </a>
      </React.Fragment>
    ));
  
    const all_selected_hidden = _.difference(this.props.selection, this.props.hidden_simulations).length === 0;
    const all_selected_visible = _.intersection(this.props.selection, this.props.hidden_simulations).length === 0;
  
    const no_hidden_unselected = _.difference(this.props.hidden_simulations, this.props.selection).length === 0;
    const unselected = _.difference(this.props.indices, this.props.selection);
    const no_visible_unselected = _.difference(unselected, this.props.hidden_simulations).length === 0;
  
    // Make an array of all open image indexes
    const open_images_indexes = this.props.open_images.map(open_image => open_image.index);
    const all_open_hidden = _.difference(open_images_indexes, this.props.hidden_simulations).length === 0;
    const all_open_selected = _.difference(open_images_indexes, this.props.selection).length === 0;
    
    // Disable show all button when there are no hidden simulations or when the disable_hide_show functionality flag is on (set by filters)
    const show_all_disabled = this.props.hidden_simulations.length == 0 || this.props.disable_hide_show;
    const show_all_title = show_all_disabled ? 'There are currently no hidden scatterplot points to show.' : 'Show All Hidden Scatterplot Points';
  
    const hide_disabled = this.props.disable_hide_show || all_selected_hidden;
    const show_disabled = this.props.disable_hide_show || all_selected_visible;
    const selected_items_header_disabled = hide_disabled && show_disabled;
  
    const hide_unselected_disabled = this.props.disable_hide_show || no_visible_unselected || all_selected_hidden;
    const show_unselected_disabled = this.props.disable_hide_show || no_hidden_unselected;
    const unselected_items_header_disabled = hide_unselected_disabled && show_unselected_disabled;
  
    // Completely hide the Pin functionality when the model has no media variables to choose from
    const hide_pin = !(this.props.media_variables && this.props.media_variables.length > 0);
    // Disable the Pin function when no media variable is selected
    // or if the current selection only contains hidden simulations
    // of if the current selection is already pinned
    const no_media_variable_selected = !(this.props.media_variable && this.props.media_variable >= 0);
    const all_selection_hidden = _.difference(this.props.selection, this.props.hidden_simulations).length === 0;
    // console.log(`all_selection_hidden is ${all_selection_hidden}`);
    // Check if the current selection is already pinned
    const unpinned_selection = _.difference(this.props.selection, open_images_indexes);
    // console.log(`unpineed_selection is ${unpinned_selection}`);
    const current_selection_pinned = unpinned_selection.length === 0;
    // console.log(`current_selection_pinned is ${current_selection_pinned}`);
    // To Do: find the unpinned items in the current selection and check if they are all off axes.
    const unpinned_selection_off_axes = false;
    const pin_selected_disabled = no_media_variable_selected || all_selection_hidden || current_selection_pinned || unpinned_selection_off_axes;
    const add_pins_to_selection_disabled = (this.props.open_images.length == 0) || all_open_hidden || all_open_selected;
    // Disabling close all only if there are no open images or all open images are hidden.
    const close_all_disabled = (this.props.open_images.length == 0) || all_open_hidden;
    const pins_header_disabled = pin_selected_disabled && add_pins_to_selection_disabled && close_all_disabled;
  
    // Determine when the entire dropdown should be disabled
    const dropdown_disabled = show_all_disabled &&
                              hide_disabled &&
                              pin_selected_disabled &&
                              show_disabled &&
                              hide_unselected_disabled &&
                              show_unselected_disabled &&
                              add_pins_to_selection_disabled
                              ;

    return (
      <div className='btn-group'>
        <button 
          className={`btn btn-sm dropdown-toggle ${this.props.button_style} ${dropdown_disabled ? 'disabled' : ''}`}
          type='button' id='selection-dropdown' data-toggle='dropdown' 
          aria-expanded='false' aria-haspopup='true' title='Perform Action On Selection'>
          Actions
        </button>
        <div id='selection-switcher' className='dropdown-menu' aria-labelledby='selection-dropdown'>
          <a href='#' 
            className={`dropdown-item ${show_all_disabled ? 'disabled' : ''}`}
            title={show_all_title}
            onClick={this.props.trigger_show_all}>
            Show All Hidden Items
          </a>
  
          {divider}
  
          <h6 className={`dropdown-header ${selected_items_header_disabled ? 'disabled' : ''}`}>
            Selected Items
          </h6>
          <a href='#' 
            className={`dropdown-item ${hide_disabled ? 'disabled' : ''}`}
            onClick={this.props.trigger_hide_selection}>
            Hide
          </a>
          <a href='#' 
            className={`dropdown-item ${show_disabled ? 'disabled' : ''}`}
            onClick={this.props.trigger_show_selection}>
            Show
          </a>
  
          {divider}
  
          <h6 className={`dropdown-header ${unselected_items_header_disabled ? 'disabled' : ''}`}>
            Unselected Items
          </h6>
          <a href='#' 
            className={`dropdown-item ${hide_unselected_disabled ? 'disabled' : ''}`}
            onClick={this.props.trigger_hide_unselected}>
            Hide Unselected
          </a>
          <a href='#' 
            className={`dropdown-item ${show_unselected_disabled ? 'disabled' : ''}`}
            onClick={this.props.trigger_show_unselected}>
            Show Unselected
          </a>
  
          {/* // Completely hide the Pin functionality when the model has no media variables to choose from */
          !hide_pin &&
          <React.Fragment>
          {divider}
  
          <h6 className={`dropdown-header ${pins_header_disabled ? 'disabled' : ''}`}>
            Pins
          </h6>
          <a href='#' 
            className={`dropdown-item ${pin_selected_disabled ? 'disabled' : ''}`}
            onClick={this.props.trigger_pin_selection}>
            Pin Selected Items
          </a>
          <a href='#' 
            className={`dropdown-item ${add_pins_to_selection_disabled ? 'disabled' : ''}`}
            onClick={this.props.trigger_select_pinned}>
            Add Pins to Selection
          </a>
          <a href='#' 
            className={`dropdown-item ${close_all_disabled ? 'disabled' : ''}`}
            onClick={this.props.trigger_close_all}>
            Close All Pins
          </a>
          </React.Fragment>
          }
  
          {/* // Completely hide the Edit functionality when the model has no rating variables */
          this.props.rating_variables.length > 0 &&
          <React.Fragment>
          {divider}
  
          <h6 className={`dropdown-header ${nothing_selected ? 'disabled' : ''}`}>
            Edit Variable Values
          </h6>
          {rating_variable_controls}
          </React.Fragment>
          }
  
        </div>
      </div>
    );
  }
};

export default ControlsSelection