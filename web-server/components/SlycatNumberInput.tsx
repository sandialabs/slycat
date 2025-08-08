import * as React from "react";

/**
 */
export interface SlycatNumberInputProps {
  value: number;
  style?: any;
  label: string;
  callBack: Function;
  id?: string;
  warning?: string;
}

/**
 * not used
 */
export interface SlycatNumberInputState {
  value: number;
}
/**
 * class that creates a a form with checkboxes
 * some other process
 */
export default class SlycatNumberInput extends React.Component<
  SlycatNumberInputProps,
  SlycatNumberInputState
> {
  /**
   * not used
   */
  public constructor(props: SlycatNumberInputProps) {
    super(props);
    this.state = {
      value: props.value,
    };
  }

  onValueChange = (value: number) => {
    if (value === "") {
      value = 1;
    }
    this.setState({ value: value });
    this.props.callBack(value);
  };

  public render() {
    const inputId = this.props.id || `number-input-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div className="form-floating mb-3">
        <input
          id={inputId}
          className={`form-control ${this.props.warning ? 'is-invalid' : ''}`}
          type="number"
          min={1}
          value={this.state.value}
          onChange={(e) => this.onValueChange(e.target.value)}
          placeholder={this.props.label}
        />
        <label htmlFor={inputId}>{this.props.label}</label>
        {this.props.warning && (
          <div className="invalid-feedback">{this.props.warning}</div>
        )}
      </div>
    );
  }
}
