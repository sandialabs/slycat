import * as React from "react";

/**
 * @param warningMessage array of message to be displayed
 */
export interface WarningProps {
  warningMessage:Array<string>
}

/**
 * takes a list of messages to be displayed as a warning
 */
export default class Warning  extends React.Component<WarningProps> {
  public constructor(props:WarningProps) {
    super(props);
  }

  render () {
    return(
      <div>
        {this.props.warningMessage.map((message, i) => {
          return (
            <div key={i}>
              <label style={{color: 'red', fontSize:'15.5px', textAlign:'center', backgroundColor:'#FFFF99', fontWeight:'bold'}}>
                {message}
              </label>
            </div>
          );})}
        </div>
    );
  }
}