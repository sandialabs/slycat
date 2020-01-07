import * as React from "react";

/**
 * @member warningMessage array of message to be displayed
 */
export interface WarningProps {
  warningMessage:Array<string>,
}

/**
 * not used
 */
export interface WarningState {
}

/**
 * takes a list of messages to be displayed as a warning
 */
export default class Warning  extends React.Component<WarningProps,WarningState> {
  public constructor(props:WarningProps) {
    super(props);
  }

  render () {
    return(
      <div className="alert alert-warning" role="alert">
        {this.props.warningMessage}
      </div>
    );
  }
}