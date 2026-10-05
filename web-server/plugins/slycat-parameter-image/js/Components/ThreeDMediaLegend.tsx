import React from "react";
import * as d3 from "d3v7";
import _ from "lodash";

export type GradientStop = {
  offset: number;
  color: string | { toString(): string };
};

export type ThreeDMediaLegendProps = {
  fontSize: number;
  fontFamily: string;
  label: string;
  gradient_data: GradientStop[];
  domain: [number, number];
  height: number;
  gradient_width: number;
  x_offset: number;
  uid: string;
  setThreeDColorByLegend: (uid: string, width: number, height: number) => void;
};

export default class ThreeDMediaLegend extends React.PureComponent<ThreeDMediaLegendProps> {
  legend_axis_ref: React.RefObject<SVGGElement>;
  legend_group_ref: React.RefObject<SVGGElement>;
  lastMeasuredWidth: number | null;
  lastMeasuredHeight: number | null;

  constructor(props: ThreeDMediaLegendProps) {
    super(props);
    this.legend_axis_ref = React.createRef();
    this.legend_group_ref = React.createRef();
    this.lastMeasuredWidth = null;
    this.lastMeasuredHeight = null;
  }

  componentDidMount = () => {
    this.createAxis();
    this.setThreeDColorByLegend();
  };

  componentDidUpdate = (prevProps: ThreeDMediaLegendProps) => {
    this.createAxis();
    const shouldRemeasure =
      this.props.height !== prevProps.height ||
      this.props.label !== prevProps.label ||
      this.props.fontSize !== prevProps.fontSize ||
      this.props.fontFamily !== prevProps.fontFamily ||
      !_.isEqual(this.props.domain, prevProps.domain) ||
      !_.isEqual(this.props.gradient_data, prevProps.gradient_data);
    if (shouldRemeasure) {
      this.setThreeDColorByLegend();
    }
  };

  createAxis = () => {
    if (!this.legend_axis_ref.current || !this.props.domain) {
      return;
    }
    const domain = _.sortBy(this.props.domain).reverse() as [number, number];
    const scale = d3.scaleLinear().domain(domain).range([0, this.props.height]);
    const legend_axis = d3.axisRight(scale).ticks(this.props.height / 50);
    d3.select(this.legend_axis_ref.current).call(legend_axis);
  };

  setThreeDColorByLegend = () => {
    if (!this.legend_group_ref.current) {
      return;
    }
    const bbox = this.legend_group_ref.current.getBBox();
    if (
      bbox.width === this.lastMeasuredWidth &&
      bbox.height === this.lastMeasuredHeight
    ) {
      return;
    }
    this.lastMeasuredWidth = bbox.width;
    this.lastMeasuredHeight = bbox.height;
    this.props.setThreeDColorByLegend(this.props.uid, bbox.width, bbox.height);
  };

  render() {
    const stops = this.props.gradient_data.map((stop, index) => (
      <stop
        key={index}
        offset={`${stop.offset}%`}
        stopColor={String(stop.color)}
      />
    ));

    return (
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
        />
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
          y={0}
          style={{
            fill: `url(#scatterplot-legend-color-gradient-${this.props.uid})`,
          }}
        />
        <text
          className="label"
          x={-12}
          y={this.props.height / 2}
          transform={`rotate(-90, ${-12}, ${this.props.height / 2})`}
          style={{
            fontSize: this.props.fontSize,
            fontFamily: this.props.fontFamily,
          }}
        >
          {this.props.label}
        </text>
      </g>
    );
  }
}
