import React, { useId } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUndo } from "@fortawesome/free-solid-svg-icons";
import styles from "./slycat-scatterplot-options.module.scss";

export type SlycatNumberInputWithResetProps = {
  name?: string;
  value: number;
  default_value: number;
  min_value?: number;
  max_value?: number;
  step?: number;
  handle_change: React.EventHandler<React.SyntheticEvent<HTMLInputElement | HTMLButtonElement>>;
  disabled?: boolean;
  title_reset: string;
  label?: string;
  id?: string;
};

export const SlycatNumberInputWithReset: React.FC<SlycatNumberInputWithResetProps> = (props) => {
  const generatedId = useId();
  const inputId = props.id ?? generatedId;
  const containerClasses = `input-group ${props.label ? "" : "input-group-sm"} w-auto d-inline-flex ${styles.slycatComponentSlycatNumberInputWithReset}`;
  const inputElement = (
    <input
      id={inputId}
      type="number"
      name={props.name}
      className={`form-control form-control-sm ${props.value !== props.default_value ? styles.edited : ""}`}
      placeholder=" "
      min={props.min_value}
      max={props.max_value}
      step={props.step}
      value={props.value}
      onChange={props.handle_change}
      disabled={props.disabled}
    />
  );
  return (
    <div className={containerClasses}>
      {props.label ? (
        <div className="form-floating">
          {inputElement}
          <label htmlFor={inputId}>{props.label}</label>
        </div>
      ) : (
        inputElement
      )}
      <button
        className="btn btn-outline-secondary"
        type="button"
        name={`${props.name ?? ""}`}
        title={props.title_reset}
        value={props.default_value}
        disabled={!!props.disabled || props.value === props.default_value}
        onClick={props.handle_change}
      >
        <FontAwesomeIcon icon={faUndo} />
      </button>
    </div>
  );
};
