import dialog from "js/slycat-dialog";
import React from "react";

const ControlsSelection = (props) => {

  const set_value = (variable, variableIndex, value, alert) => {
    dialog.prompt({
      title: "Set Values",
      message: "Set values for " + variable + ":",
      value: '',
      alert: alert,
      buttons: [
        {className: "btn-default", label:"Cancel"},
        {className: "btn-primary",  label:"Apply"}
      ],
      callback: function(button, value)
      {
        if(button.label === "Apply")
        {
          let value = value().trim();
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
      <li role="presentation" className="dropdown-header">{props.metadata['column-names'][rating_variable]}</li>
      <li role='presentation'><a role="menuitem" tabIndex="-1"
        onClick={(e) => set_value(props.metadata['column-names'][rating_variable], rating_variable, e)}>Set</a></li>
    </React.Fragment>
  );

  return (
    <div className="btn-group btn-group-xs">
      <button className={'btn btn-default dropdown-toggle ' + (props.selection.length > 0 ? '' : 'disabled')}
        type="button" id="selection-dropdown" data-toggle="dropdown" aria-expanded="true" title="Perform Action On Selection">
        Selection Action&nbsp;
        <span className="caret"/>
      </button>
      <ul id="selection-switcher" className="dropdown-menu" role="menu" aria-labelledby="selection-dropdown">
        {rating_variable_controls}
        <li role="presentation" className="dropdown-header">Scatterplot Points</li>
        <li role='presentation' className={props.disable_hide_show ? 'disabled' : ''}>
          <a role="menuitem" tabIndex="-1" onClick={props.trigger_hide_selection}>Hide</a>
        </li>
        <li role='presentation' className={props.disable_hide_show ? 'disabled' : ''}>
          <a role="menuitem" tabIndex="-1" onClick={props.trigger_hide_unselected}>Hide Unselected</a>
        </li>
        <li role='presentation' className={props.disable_hide_show ? 'disabled' : ''}>
          <a role="menuitem" tabIndex="-1" onClick={props.trigger_show_selection}>Show</a>
        </li>
        {!props.hide_pin &&
          <li role='presentation' className={props.disable_pin ? 'disabled' : ''}>
            <a role="menuitem" tabIndex="-1" onClick={props.trigger_pin_selection}>Pin</a>
          </li>
        }
      </ul>
    </div>
  );
};

export default ControlsSelection