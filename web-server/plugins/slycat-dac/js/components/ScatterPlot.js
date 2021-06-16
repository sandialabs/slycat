import React from "react";
import { connect } from "react-redux";
import * as d3 from "d3v6";
import * as fc from "d3fc";

class ScatterPlot extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  render() {

    // Don't render anything if we have no mds_coords
    if (!this.props.mds_coords || this.props.mds_coords.length == 0) {
      return null;
    }

    const data = this.props.mds_coords;

    const xExtent = fc
      .extentLinear()
      .accessors([(d) => {
        // console.log(`d is %o`, d)
        return d[0];
      }])
      // Add padding so point halves aren't cut off at ends of axis
      // .pad([0.003, 0.1])
      ;
    const yExtent = fc
      .extentLinear()
      .accessors([d => d[1]])
      // Add padding so point halves aren't cut off at ends of axis
      // .pad([0.001, 0.1])
      ;
    
    const xScale = d3.scaleLinear().domain(xExtent(this.props.mds_coords));
    const yScale = d3.scaleLinear().domain(yExtent(this.props.mds_coords));

    const zoom = fc.zoom().on('zoom', render);

    // const gridlines = fc.annotationSvgGridline();

    const symbols = [
      // d3.symbolCircle,
      // d3.symbolCross,
      // d3.symbolDiamond,
      d3.symbolSquare,
      // d3.symbolStar,
      // d3.symbolTriangle,
      // d3.symbolWye
    ];

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    // const color = d3.scaleOrdinal(d3.schemeRdBu);

    const pointSeries = fc
      .seriesWebglPoint()
      .crossValue(d => d[0])
      .mainValue(d => d[1])
      .size(d => {
        
          // console.log(Math.pow(Math.max(100, xScale(d.carat + 0.01) - xScale(d.carat)), 1));
          return 800;
          // return Math.pow(Math.max(100, xScale(d.carat + 0.01) - xScale(d.carat)), 1);
      }
      )
      // .type(d => {
      //     return d3.symbolSquare;
      // })
      // .size((_, i) => 30 + 100 * (i % 10))
      // .type((_, i) => symbols[i % symbols.length])
      // .type(d3.symbolTriangle)
      .type(d3.symbolSquare)
      // .type(d3.symbolCircle)
      .defined(() => true)
      .equals(d => d.length)
      .decorate( (program, data) => {
        // Set the color of the shapes
        fc.webglFillColor([60 / 255, 180 / 255, 240 / 255, 1.0])(program);
        // fc.webglFillColor([20 / 255, 80 / 255, 24 / 255, 1.0])(program);

        // fc.webglFillColor()
        //   .value((_, i) => {
        //     const rgba = d3.color(color(i));
        //     return [rgba.r / 255, rgba.g / 255, rgba.b / 255, rgba.opacity];
        //   })
        //   .data(data)(program);
        
        // Trying to add a stroke color. Doesn't render strokes because width is not set maybe???
        // fc.webglStrokeColor([60 / 255, 180 / 255, 240 / 255, 1.0])(program);
        // fc.webglStrokeColor()
        //     .data(data)
        //     .value(d => 
        //          d.close > d.open ? 
        //              [0, 0, 1, 1] : [1, 0, 0, 1]
        //     );

        // program.fragmentShader().appendBody(`
        //     if (gl_PointCoord.y > 0.6 || gl_PointCoord.y < 0.4) {
        //         discard;
        //     }
        // `);


        const gl = program.context();
        // Setting up the clear color (i.e., background color)
        // gl.clearColor(0.5, 0.5, 0.5, 1.0);
        gl.clearColor(1.0, 1.0, 1.0, 0.0);
        // Clearing screen with clearColor set up just above
        gl.clear(gl.COLOR_BUFFER_BIT);

        // gl.enable(gl.BLEND);
        // gl.blendColor(0.3, 0.6, 0.9, 1.0);
        // gl.blendFuncSeparate(
        //     gl.DST_COLOR,
        //     gl.ZERO,
        //     gl.CONSTANT_ALPHA,
        //     gl.ZERO
        // );
      });

    const chart = fc
      .chartCartesian(xScale, yScale)
      // .svgPlotArea(gridlines)
      .webglPlotArea(pointSeries)
      .yOrient('left')
      // .xLabel('Carats →')
      // .yLabel('↑ Price $')
      // .xTickFormat(d3.format('.1f'))
      // .yTickFormat(d3.format('.1s'))
      .decorate(selection => {
        selection
          .enter()
          .select('.webgl-plot-area')
          .raise()
          .call(zoom, xScale, yScale);
      });

    function render() {
      d3.select('#scatter-plot-react')
        .datum(data)
        .call(chart);
    }

    render();

    return (
      <div>
        {/* <div>This is the React scatter plot.</div>
        <br />
        <div>These are from redux state.</div>
        <div>mds_coords is: {this.props.mds_coords}</div>
        <br />
        <div>These are from local state.</div>
        <div>MAX_POINTS_ANIMATE is: {this.props.MAX_POINTS_ANIMATE}</div>
        <div>SCATTER_PLOT_TYPE is: {this.props.SCATTER_PLOT_TYPE}</div>
        <div>cont_colormap is: {this.props.cont_colormap}</div>
        <div>SCATTER_BORDER is: {this.props.SCATTER_BORDER}</div>
        <div>POINT_COLOR is: {this.props.POINT_COLOR}</div>
        <div>POINT_SIZE is: {this.props.POINT_SIZE}</div>
        <div>NO_SEL_COLOR is: {this.props.NO_SEL_COLOR}</div>
        <div>SELECTION_COLOR is: {this.props.SELECTION_COLOR}</div>
        <div>FOCUS_COLOR is: {this.props.FOCUS_COLOR}</div>
        <div>COLOR_BY_LOW is: {this.props.COLOR_BY_LOW}</div>
        <div>COLOR_BY_HIGH is: {this.props.COLOR_BY_HIGH}</div>
        <div>OUTLINE_NO_SEL is: {this.props.OUTLINE_NO_SEL}</div>
        <div>OUTLINE_SEL is: {this.props.OUTLINE_SEL}</div>
        <div>var_include_columns is: {this.props.var_include_columns}</div>
        <div>init_alpha_values is: {this.props.init_alpha_values}</div>
        <div>init_color_by_col is: {this.props.init_color_by_col}</div>
        <div>init_zoom_extent is: {this.props.init_zoom_extent}</div>
        <div>init_subset_center is: {this.props.init_subset_center}</div> */}
      </div>
    );
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
})(ScatterPlot);
