import React from "react";
import css from "css/slycat-variable-alias-labels.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

export default class VariableAliasLabels extends React.PureComponent {
  variables = this.props.metadata["column-names"];

  render() {
    // console.log('VariableAliasLabels render');
    return (
      <div className={`slycat-variable-alias-labels ${this.props.uniqueID}`}>
        <table className="table table-striped table-hover table-sm table-borderless">
          <thead>
            <tr>
              <th scope="col" className="align-top">
                Name
              </th>
              <th scope="col" className="align-top">
                Label
              </th>
            </tr>
          </thead>
          <tbody>
            {this.variables.map((variable, index) => {
              let userInput = this.props.variableAliases[index] != undefined;
              return (
                <VariableAliasLabelsRow
                  key={index}
                  index={index}
                  variable={variable}
                  alias={this.props.variableAliases[index] ? this.props.variableAliases[index] : ""}
                  userInput={userInput}
                  onChange={this.props.onChange}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

class VariableAliasLabelsRow extends React.PureComponent {
  clearLabel = (event) => {
    let index = event.currentTarget.name;
    let input = document.querySelector(`.slycat-variable-alias-labels input[name='${index}'`);
    input.value = "";
    this.props.onChange(event);
  };

  render() {
    return (
      <tr key={this.props.index}>
        <th scope="row" className="align-middle variable-name">
          {this.props.variable}
        </th>
        <td>
          <div className="input-group input-group-sm">
            <input
              type="text"
              className={`form-control form-control-sm variable-alias 
                ${this.props.userInput ? "contains-user-input" : ""}`}
              minLength="0"
              maxLength="256"
              name={this.props.index}
              value={this.props.alias}
              onChange={this.props.onChange}
            />
            <button
              className="btn btn-outline-secondary"
              type="button"
              title="Clear alias label"
              name={this.props.index}
              value=""
              disabled={!this.props.userInput}
              onClick={this.clearLabel}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </td>
      </tr>
    );
  }
}
