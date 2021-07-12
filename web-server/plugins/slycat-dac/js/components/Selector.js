import React from "react";
import { connect } from "react-redux";
import * as d3 from "d3";

class Selector extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  render() {

    // Don't do anything if we have no mds_coords
    if (!this.props.mds_coords || this.props.mds_coords.length == 0) {
      return null;
    }

    // svg scatter plot
    const selector = d3.select("#dac-selector-svg");
    const border = this.props.SCATTER_BORDER;
    const x_scale = d3.scale.linear().domain([0 - border, 1 + border]);
    const y_scale = d3.scale.linear().domain([0 - border, 1 + border]);

    // draw svg to size of container
    const width = $("#dac-mds-pane").width();
    const height = $("#dac-mds-pane").height();

    // set correct viewing window
    x_scale.range([0,width]);
    y_scale.range([height,0]);

    const brush = d3.svg.brush()
      .x(x_scale)
      .y(y_scale)
    ;

    // enable selection
		selector.append("g")
      .attr("class", "brush")
      .call(brush)
    ;

    const brushReadyEvent = new CustomEvent("DACBrushReady", { 
      detail: {
        brush: brush,
      } 
    });
    document.body.dispatchEvent(brushReadyEvent);

    // Nothing to render from React, so returning null
    return null;
  }
}

const mapStateToProps = (state) => {
  return {
    mds_coords: state.derived.mds_coords,
  };
};

export default connect(mapStateToProps, {
  // changeThreeDColormap,
  // updateThreeDColorBy,
})(Selector);
