import React from "react";
export default class MarkingsBadge extends React.Component<any, any> {
  render() {
    let badge;

    if (this.props.recognized_marking === undefined) {
      return (
        <div className="card-header bg-warning text-center fw-bold rounded-top-0">
          Unrecognized Marking
          {this.props.marking && <span>: </span>}
          {this.props.marking}
        </div>
      );
    }
    // badge() function returns HTML, which React escapes, so we need to use
    // dangerouslySetInnerHTML per https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml
    return <div dangerouslySetInnerHTML={{ __html: this.props.recognized_marking.badge }} />;
  }
}
