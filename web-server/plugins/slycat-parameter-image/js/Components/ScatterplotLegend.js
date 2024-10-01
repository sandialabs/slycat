import React from "react";
import d3 from "d3";
import _ from "lodash";

export default class ScatterplotLegend extends React.PureComponent {
  constructor(props) {
    super(props);
    this.legend_axis_ref = React.createRef();
    this.legend_group_ref = React.createRef();
  }

  componentDidMount = () => {
    this.createAxis();
    this.setThreeDColorByLegend();
  };

  componentDidUpdate = (prevProps, prevState, snapshot) => {
    this.createAxis();
    const updateThreeDColorByLegend =
      this.props.height != prevProps.height ||
      this.props.label != prevProps.label ||
      this.props.fontSize != prevProps.fontSize ||
      this.props.fontFamily != prevProps.fontFamily;
    if (updateThreeDColorByLegend) {
      this.setThreeDColorByLegend();
    }
  };

  createAxis = () => {
    let domain = _.sortBy(this.props.domain).reverse();
    let scale = d3.scale.linear().domain(domain).range([0, this.props.height]);
    let legend_axis = d3.svg
      .axis()
      .scale(scale)
      .orient("right")
      .ticks(this.props.height / 50);
    d3.select(this.legend_axis_ref.current).call(legend_axis);
  };

  setThreeDColorByLegend = () => {
    const bbox = this.legend_group_ref.current.getBBox();
    // console.log(`createAxis for ${this.props.uid} has width ${bbox.width} and height ${bbox.height}`);
    this.props.setThreeDColorByLegend({
      uid: this.props.uid,
      width: bbox.width,
      height: bbox.height,
    });
  };

  render() {
    const stops = this.props.gradient_data.map((stop, index) => (
      <stop key={index} offset={`${stop.offset}%`} stopColor={stop.color} />
    ));

    return (
      <React.Fragment>
        <g
          className="legendGroup"
          ref={this.legend_group_ref}
          transform={`translate(${this.props.x_offset}, 0)`}
        >
          <g
            ref={this.legend_axis_ref}
            className="legend-axis"
            transform={`translate(${this.props.gradient_width}, 0)`}
            style={{
              fontSize: this.props.fontSize,
              fontFamily: this.props.fontFamily,
            }}
          ></g>
          <defs>
            <linearGradient
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
              id={`scatterplot-legend-color-gradient-${this.props.uid}`}
            >
              {stops}
            </linearGradient>
          </defs>
          <rect
            className="color"
            width={this.props.gradient_width}
            height={this.props.height}
            x={0}
            y="0"
            style={{
              fill: `url(#scatterplot-legend-color-gradient-${this.props.uid})`,
            }}
          ></rect>
          <text
            className="label"
            x={-15}
            y={this.props.height / 2}
            transform={`rotate(-90, ${-15}, ${this.props.height / 2})`}
            style={{
              fontSize: this.props.fontSize,
              fontFamily: this.props.fontFamily,
            }}
          >
            {this.props.label}
          </text>
        </g>
      </React.Fragment>
    );
  }
}
