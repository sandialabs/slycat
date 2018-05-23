import dialog from "../../../../js/slycat-dialog-webpack";
import React from "react";

class ControlsSelection extends React.Component {
  constructor(props) {
    super(props);
  }

  set_value(variable, variableIndex, value, alert) {
    var self = this;
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
        if(button.label == "Apply")
        {
          var value = value().trim();
          var numeric = self.props.metadata["column-types"][variableIndex] != "string";
          var valueValid = value.length > 0;
          if( valueValid && numeric && isNaN(Number(value)) ) {
            valueValid = false;
          }
          if(valueValid) {
            self.props.element.trigger("set-value", {
              selection : self.props.selection,
              variable : variableIndex,
              value : numeric ? value : '"' + value + '"',
            });
          } else {
            var alert = "Please enter a value.";
            if(numeric)
              alert = "Please enter a numeric value.";
            self.set_value(variable, variableIndex, value, alert);
          }
        }
      },
    });
  }

  render() {
    let rating_variable_controls = this.props.rating_variables.map((rating_variable) =>
      <React.Fragment key={rating_variable}>
        <li role="presentation" className="dropdown-header">{this.props.metadata['column-names'][rating_variable]}</li>
        <li role='presentation'><a role="menuitem" tabIndex="-1"
          onClick={(e) => this.set_value(this.props.metadata['column-names'][rating_variable], rating_variable, e)}>Set</a></li>
      </React.Fragment>
    );
    return (
      <div className="btn-group btn-group-xs">
        <button className={'btn btn-default dropdown-toggle ' + (this.props.selection.length > 0 ? '' : 'disabled')}
          type="button" id="selection-dropdown" data-toggle="dropdown" aria-expanded="true" title="Perform Action On Selection">
          Selection Action&nbsp;
          <span className="caret"></span>
        </button>
        <ul id="selection-switcher" className="dropdown-menu" role="menu" aria-labelledby="selection-dropdown">
          {rating_variable_controls}
          <li role="presentation" className="dropdown-header">Scatterplot Points</li>
          <li role='presentation' className={this.props.disable_hide_show ? 'disabled' : ''}>
            <a role="menuitem" tabIndex="-1" onClick={this.props.trigger_hide_selection}>Hide</a>
          </li>
          <li role='presentation' className={this.props.disable_hide_show ? 'disabled' : ''}>
            <a role="menuitem" tabIndex="-1" onClick={this.props.trigger_hide_unselected}>Hide Unselected</a>
          </li>
          <li role='presentation' className={this.props.disable_hide_show ? 'disabled' : ''}>
            <a role="menuitem" tabIndex="-1" onClick={this.props.trigger_show_selection}>Show</a>
          </li>
          {!this.props.hide_pin &&
            <li role='presentation' className={this.props.disable_pin ? 'disabled' : ''}>
              <a role="menuitem" tabIndex="-1" onClick={this.props.trigger_pin_selection}>Pin</a>
            </li>
          }
        </ul>
      </div>
    );
  }
}

export default ControlsSelection