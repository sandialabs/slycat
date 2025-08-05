import * as React from "react";

/**
 */
export interface SlycatTimeInputProps {
  hours: number;
  minutes: number;
  minCallBack: Function;
  hourCallBack: Function;
  label: string;
}

/**
 * not used
 */
export interface SlycatTimeInputState {
  hours: number;
  minutes: number;
}
/**
 * class that creates a a form with checkboxes
 * some other process
 */
export default class SlycatTimeInput extends React.Component<
  SlycatTimeInputProps,
  SlycatTimeInputState
> {
  /**
   * not used
   */
  public constructor(props: SlycatTimeInputProps) {
    super(props);
    this.state = {
      hours: props.hours,
      minutes: props.minutes,
    };
  }

  onHourChange = (value) => {
    // localStorage.setItem("slycat-remote-controls-username", value);
    // this.setState({value: value});
    if (value === "") {
      value = 0;
    }
    this.setState({ hours: value });
    this.props.hourCallBack(value);
  };

  onMinuteChange = (value) => {
    if (value === "") {
      value = 0;
    }
    this.setState({ minutes: value });
    this.props.minCallBack(value);
  };

  public render() {
    const hoursId = `hours-${Math.random().toString(36).substr(2, 9)}`;
    const minutesId = `minutes-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="mb-3">
        <div className="mb-2">{this.props.label}</div>
        <div className="row g-2">
          <div className="col">
            <div className="form-floating">
              <input
                id={hoursId}
                className="form-control"
                type="number"
                min={0}
                value={this.state.hours}
                onChange={(e) => this.onHourChange(e.target.value)}
                placeholder="Hours"
              />
              <label htmlFor={hoursId}>Hours</label>
            </div>
          </div>
          <div className="col">
            <div className="form-floating">
              <input
                id={minutesId}
                className="form-control"
                type="number"
                min={0}
                value={this.state.minutes}
                onChange={(e) => this.onMinuteChange(e.target.value)}
                placeholder="Minutes"
              />
              <label htmlFor={minutesId}>Minutes</label>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
