import React from "react";
export default class MarkingsBadge extends React.Component<any,any> {
    render() {
      let badge;
  
      if (this.props.recognized_marking === undefined) {
        return (
          <div className='float-right marking-badge' style={{ display: "inline-block" }}>
            <span className='badge badge-danger'>
              Unrecognized Marking
              {this.props.marking && <span>: </span>}
              {this.props.marking}
            </span>
          </div>
        );
      } 
        // badge() function returns HTML, which React escapes, so we need to use
        // dangerouslySetInnerHTML per https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml
        return (
          <div
            className='float-right marking-badge'
            style={{ display: "inline-block" }}
            dangerouslySetInnerHTML={{ __html: this.props.recognized_marking.badge }}
           />
        );
      
    }
  }