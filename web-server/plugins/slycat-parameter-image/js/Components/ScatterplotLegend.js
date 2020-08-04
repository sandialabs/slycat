import React from "react";
import { connect } from 'react-redux';
import { v1 as uuidv1 } from 'uuid';

export default class ScatterplotLegend extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    if (!this.props.render) {
      return null;
    }
    let uuid = uuidv1();
    let stops = this.props.gradient_data.map((stop, index) => (
      <stop 
        key={index}
        offset={`${stop.offset}%`} 
        stop-color={stop.color}
      />
    ));
    return (
      <React.Fragment>
        <defs>
          <linearGradient 
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
            id={`scatterplot-legend-color-gradient-${uuid}`}
          >
            {stops}
          </linearGradient>
        </defs>
        <rect
          className="color"
          width="10"
          height="200"
          x="0"
          y="0"
          style={{
            fill: `url(#scatterplot-legend-color-gradient-${uuid})`
          }}
        ></rect>
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
          {this.props.label}
        </text>
      </React.Fragment>
    );
  }
}