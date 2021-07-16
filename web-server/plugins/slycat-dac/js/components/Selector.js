import React from "react";
import { connect } from "react-redux";
import * as d3 from "d3";

class Selector extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  setScaleDomain = () => {
    // console.debug(`dac_zoom_flag is %o and zoom extent is %o`, this.props.dac_zoom_flag, this.props.dac_zoom_extent);
    let x_scale_domain, y_scale_domain;
    const border = this.props.SCATTER_BORDER;
    // check for zooming
    if (this.props.dac_zoom_flag && this.props.dac_zoom_extent != null) {
      // console.debug(`Overriding default zoom extent with %o`, this.props.dac_zoom_extent);
      x_scale_domain = [this.props.dac_zoom_extent[0][0], this.props.dac_zoom_extent[1][0]];
      y_scale_domain = [this.props.dac_zoom_extent[0][1], this.props.dac_zoom_extent[1][1]];
    }
    else {
      // console.debug(`Setting default zoom extent`);
      x_scale_domain = [0 - border, 1 + border];
      y_scale_domain = [0 - border, 1 + border];
    }
    this.x_scale.domain(x_scale_domain);
    this.y_scale.domain(y_scale_domain);
  }

  setScaleRange = () => {
    // draw svg to size of container
    const width = $("#dac-mds-pane").width();
    const height = $("#dac-mds-pane").height();
    // console.debug(
    //   `Selector component getting width of %o and height of %o`,
    //   width,
    //   height
    // );

    // set correct viewing window
    this.x_scale.range([0,width]);
    this.y_scale.range([height,0]);
  }

  componentDidMount() {
    const selector = d3.select(this.el);

    this.x_scale = d3.scale.linear();
    this.y_scale = d3.scale.linear();

    this.setScaleDomain();
    this.setScaleRange();

    this.brush = d3.svg.brush()
      .x(this.x_scale)
      .y(this.y_scale)
    ;

    // enable selection
		selector.append("g")
      .attr("class", "brush")
      .call(this.brush)
    ;

    // console.debug(
    //   `About to dispatch a new brush ready event with brush %o with x domain %o and y domain %o`,
    //   this.brush,
    //   this.brush.x().domain(),
    //   this.brush.y().domain()
    // );
    const brushReadyEvent = new CustomEvent("DACBrushReady", { 
      detail: {
        brush: this.brush,
      } 
    });
    document.body.dispatchEvent(brushReadyEvent);
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // console.debug(`Selector componentDidUpdate`);
    // Update scale domain and range
    this.setScaleDomain();
    // console.debug(`prevProps is %o, prevState is %o, snaphost is %o`, prevProps, prevState, snapshot);
    this.setScaleRange();
    // Update brush since size of pane could have changed
    d3.select(this.el).selectAll('.brush').call(this.brush);
  }

  render() {
    return (
      <svg id="dac-selector-svg" ref={el => this.el = el}></svg>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    dac_zoom_extent: state.dac_zoom_extent,
    dac_zoom_flag: state.dac_zoom_flag,
    scatterplot_size: state.scatterplot_size,
  };
};

export default connect(mapStateToProps, {})(Selector);
