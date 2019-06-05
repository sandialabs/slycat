import * as React from "react";

/**
 * @param warningMessage array of message to be displayed
 */
export interface WarningProps {
  warningMessage:Array<string>,
  backgroundColor:string
}

/**
 * takes a list of messages to be displayed as a warning
 */
export default class Warning  extends React.Component<WarningProps> {
  public constructor(props:WarningProps) {
    super(props);
  }
  
  /**
   * build a list of label for display based of the props warning messages
   *
   * @memberof Warning
   */
  getLabels = () => {
    const labels = this.props.warningMessage.map((message, i) => {
      return (
          <label key={i} style={{color: 'red', fontSize:'15.5px', textAlign:'center', backgroundColor:this.props.backgroundColor?this.props.backgroundColor:'', fontWeight:'bold'}}>
            {message}
          </label>
      );
    });
    return labels
  }

  render () {
    return(
      <div>
        {this.getLabels()}
      </div>
    );
  }
}