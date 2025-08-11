import * as React from "react";

/**
 * @param {onSelectCallBack} callback when selected
 * @param {options} option list
 * @param {label} label for the dropdown
 */
export interface SlycatSelectorProps {
  onSelectCallBack: Function;
  options: Option[];
  label: string;
  disabled?: boolean;
}

/**
 * object with selector value and text string for display
 *
 * @interface option
 */
export interface Option {
  text: string;
  value: string;
}

/**
 * not used
 */
export interface SlycatSelectorState {}
/**
 * class that creates a dropdown with values given in options prop
 */
export default class SlycatSelector extends React.Component<
  SlycatSelectorProps,
  SlycatSelectorState
> {
  /**
   * not used
   */
  public constructor(props: SlycatSelectorProps) {
    super(props);
    this.state = {};
  }

  /**
   * gets a jsx list of options
   *
   * @memberof SlycatSelector
   */
  getOptions = (): JSX.Element[] => {
    const jsxOptions = this.props.options.map((option, i) => (
      <option key={i} value={option.value}>
        {option.text}
      </option>
    ));
    return jsxOptions;
  };

  public render() {
    const selectId = `select-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div className="form-floating mb-3">
        {this.props.disabled === true ? (
          <select
            id={selectId}
            className="form-select"
            onChange={(e) => this.props.onSelectCallBack(e.target.value)}
            disabled
          >
            {this.getOptions()}
          </select>
        ) : (
          <select
            id={selectId}
            className="form-select"
            onChange={(e) => this.props.onSelectCallBack(e.target.value)}
          >
            {this.getOptions()}
          </select>
        )}
        <label htmlFor={selectId}>{this.props.label}</label>
      </div>
    );
  }
}
