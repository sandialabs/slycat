import * as React from "react";

/**
 */
export interface SlycatTextInputProps {
  onChange?: Function;
  value: string;
  style?: any;
  label: string;
  callBack: Function;
  id?: string;
  warning?: string;
}

/**
 * not used
 */
export interface SlycatTextInputState {
  value: string;
}
/**
 * class that creates a a form with checkboxes
 * some other process
 */
export default class SlycatTextInput extends React.Component<
  SlycatTextInputProps,
  SlycatTextInputState
> {
  /**
   * not used
   */
  public constructor(props: SlycatTextInputProps) {
    super(props);
    this.state = {
      value: props.value,
    };
  }

  onValueChange = (value: string) => {
    // localStorage.setItem("slycat-remote-controls-username", value);
    // this.setState({value: value});
    this.setState({ value: value });
    this.props.callBack(value);
  };

  public render() {
    const inputId = this.props.id || `input-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div className="form-floating mb-3">
        <input
          id={inputId}
          className={`form-control ${this.props.warning ? 'is-invalid' : ''}`}
          type="text"
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
