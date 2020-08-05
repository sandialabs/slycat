import React from "react";
import { connect } from 'react-redux';
import { v1 as uuidv1 } from 'uuid';
import d3 from 'd3';

export default class ScatterplotLegend extends React.PureComponent {
  constructor(props) {
    super(props);
    this.legend_axis_ref = React.createRef();
  }

  componentDidMount = () => {
    this.createAxis();
  }

  componentDidUpdate = () => {
    this.createAxis();
  }

  createAxis = () => {
    if(this.props.render)
    {
      // Domain is reversed to match up with color scale
      let domain = this.props.domain.reverse();
      let scale = d3.scale.linear()
        .domain(domain)
        .range([0, this.props.height])
        ;
      
      let legend_axis = d3.svg.axis()
        .scale(scale)
        .orient("right")
        .ticks(this.props.height / 50)
        ;
      
      d3.select(this.legend_axis_ref.current)
        .call(legend_axis)
        ;
    }
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
        stopColor={stop.color}
      />
    ));
    return (
      <React.Fragment>
        <g 
          ref={this.legend_axis_ref}
          className="legend-axis"
          transform={`translate(${this.props.width},0)`}
          style={{
            fontSize: this.props.fontSize,
            fontFamily: this.props.fontFamily,
          }}
        >
        </g>
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
          width={this.props.width}
          height={this.props.height}
          x="0"
          y="0"
          style={{
            fill: `url(#scatterplot-legend-color-gradient-${uuid})`
          }}
        ></rect>
        <text 
          className="label" 
          x="-15" 
          y={this.props.height / 2}
          transform={`rotate(-90,-15,${this.props.height / 2})`}
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