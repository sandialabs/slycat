import React from "react";
import * as d3 from "d3v7";
import * as fc from "d3fc";
import _ from "lodash";

type ScatterplotGridProps = {
  x_scale_range: [number, number];
  y_scale_range: [number, number];
  x_values: number[];
  y_values: number[];
  x_ticks: number;
  y_ticks: number;
};

export default class ScatterplotGrid extends React.PureComponent<ScatterplotGridProps> {
  private updateGrid = () => {
    console.debug("ScatterplotGrid.updateGrid()");
    const xScale = d3
      .scaleLinear()
      .range(this.props.x_scale_range)
      .domain([d3.min(this.props.x_values), d3.max(this.props.x_values)]);
    const yScale = d3
      .scaleLinear()
      .range(this.props.y_scale_range)
      .domain([d3.min(this.props.y_values), d3.max(this.props.y_values)]);
    const gridline = fc
      .annotationSvgGridline()
      .xScale(xScale)
      .yScale(yScale)
      .xTicks(this.props.x_ticks)
      .yTicks(this.props.y_ticks);
    d3.select("#grid").call(gridline);
  };

  componentDidMount = () => {
    console.debug("ScatterplotGrid.componentDidMount()");
    this.updateGrid();
  };

  componentDidUpdate = () => {
    console.debug("ScatterplotGrid.componentDidUpdate()");
    this.updateGrid();
  };

  render() {
    return (
      // Create a g element that will contain the scatterplot grid
      <g id="grid" />
    );
  }
}
