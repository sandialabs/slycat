import React from "react";
import { connect } from 'react-redux';

export default class ScatterplotLegend extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (!this.props.render) {
      return null;
    }
    return (
      <text 
        className="label" 
        x="-15" 
        y="259.5" 
        transform="rotate(-90,-15,259.5)"
        style={{
          fontSize: this.props.fontSize,
          fontFamily: this.props.fontFamily,
        }}
      >
        {this.props.threeDLegendLabel}
      </text>
    );
  }
}