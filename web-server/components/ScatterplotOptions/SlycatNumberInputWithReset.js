import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUndo } from "@fortawesome/free-solid-svg-icons";
import styles from "./slycat-scatterplot-options.module.scss";

export class SlycatNumberInputWithReset extends React.Component {
  render() {
    return (
      <div
        className={`input-group input-group-sm w-auto d-inline-flex ${styles.slycatComponentSlycatNumberInputWithReset}`}
      >
        <input
          type="number"
          name={this.props.name}
          className={`form-control form-control-sm 
            ${this.props.value != this.props.default_value ? styles.edited : ""}`}
          min={this.props.min}
          max={this.props.max}
          step={this.props.step}
          value={this.props.value}
          onChange={this.props.handle_change}
          disabled={this.props.disabled}
        />
        <button
          className="btn btn-outline-secondary"
          type="button"
          name={`${this.props.name}`}
          title={this.props.title_reset}
          value={this.props.default_value}
          disabled={this.props.disabled || this.props.value == this.props.default_value}
          onClick={this.props.handle_change}
        >
          <FontAwesomeIcon icon={faUndo} />
        </button>
      </div>
    );
  }
}


