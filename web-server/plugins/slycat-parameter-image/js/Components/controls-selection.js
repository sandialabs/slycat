import * as dialog from "js/slycat-dialog";
import React from "react";

const ControlsSelection = (props) => {

  const set_value = (variable, variableIndex, value, alert) => {
    dialog.prompt({
      title: "Set Values",
      message: "Set values for " + variable + ":",
      value: '',
      alert: alert,
      buttons: [
        {className: "btn-light", label:"Cancel"},
        {className: "btn-primary",  label:"Apply"}
      ],
      callback: function(button, valueIn)
      {
        if(button.label === "Apply")
        {
          let value = valueIn().trim();
          let numeric = props.metadata["column-types"][variableIndex] !== "string";
          let valueValid = value.length > 0;
          if( valueValid && numeric && isNaN(Number(value)) ) {
            valueValid = false;
          }
          if(valueValid) {
            props.element.trigger("set-value", {
              selection : props.selection,
              variable : variableIndex,
              value : numeric ? value : '"' + value + '"',
            });
          } else {
            let alert = "Please enter a value.";
            if(numeric)
              alert = "Please enter a numeric value.";
            set_value(variable, variableIndex, value, alert);
          }
        }
      },
    });
  };

  let rating_variable_controls = props.rating_variables.map((rating_variable) =>
    <React.Fragment key={rating_variable}>
      <h6 className="dropdown-header">{props.metadata['column-names'][rating_variable]}</h6>
      <a href="#" className="dropdown-item"
         onClick={(e) => set_value(props.metadata['column-names'][rating_variable], rating_variable, e)}>
        Set
      </a>
    </React.Fragment>
  );

  return (
    <div className="btn-group">
      <button className={`btn btn-sm dropdown-toggle ${props.button_style} ${props.selection.length > 0 ? '' : 'disabled'}`}
        type="button" id="selection-dropdown" data-toggle="dropdown" aria-expanded="false" aria-haspopup="true" title="Perform Action On Selection">
        Selection Action
      </button>
      <div id="selection-switcher" className="dropdown-menu" aria-labelledby="selection-dropdown">
        {rating_variable_controls}
        <h6 className="dropdown-header">Scatterplot Points</h6>
        <a href="#" className={`dropdown-item ${props.disable_hide_show ? 'disabled' : ''}`}
           onClick={props.trigger_hide_selection}>
          Hide
        </a>
        <a href="#" className={`dropdown-item ${props.disable_hide_show ? 'disabled' : ''}`}
           onClick={props.trigger_hide_unselected}>
          Hide Unselected
        </a>
        <a href="#" className={`dropdown-item ${props.disable_hide_show ? 'disabled' : ''}`}
           onClick={props.trigger_show_selection}>
          Show
        </a>
        {!props.hide_pin &&
          <a href="#" className={`dropdown-item ${props.disable_pin ? 'disabled' : ''}`}
             onClick={props.trigger_pin_selection}>
            Pin
          </a>
        }
      </div>
    </div>
  );
};

export default ControlsSelection