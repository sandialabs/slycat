import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUndo } from "@fortawesome/free-solid-svg-icons";
import styles from "./slycat-scatterplot-options.module.scss";

export const SlycatNumberInputWithReset = (props) => {
  return (
    <div
      className={`input-group input-group-sm w-auto d-inline-flex ${styles.slycatComponentSlycatNumberInputWithReset}`}
    >
      <input
        type="number"
        name={props.name}
        className={`form-control form-control-sm 
          ${props.value != props.default_value ? styles.edited : ""}`}
        min={props.min_value}
        max={props.max_value}
        step={props.step}
        value={props.value}
        onChange={props.handle_change}
        disabled={props.disabled}
      />
      <button
        className="btn btn-outline-secondary"
        type="button"
        name={`${props.name}`}
        title={props.title_reset}
        value={props.default_value}
        disabled={props.disabled || props.value == props.default_value}
        onClick={props.handle_change}
      >
        <FontAwesomeIcon icon={faUndo} />
      </button>
    </div>
  );
};
