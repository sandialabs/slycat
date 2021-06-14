import React from "react";
import { connect } from "react-redux";
// import { changeThreeDColormap, updateThreeDColorBy } from "../actions";

class ScatterPlot extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  render() {

    return (
      <div>
        <div>This is the React scatter plot.</div>
        <br />
        <div>These are from redux state.</div>
        <div>MAX_POINTS_ANIMATE is: {this.props.MAX_POINTS_ANIMATE}</div>
        <div>SCATTER_PLOT_TYPE is: {this.props.SCATTER_PLOT_TYPE}</div>
        <div>cont_colormap is: {this.props.cont_colormap}</div>
        <br />
        <div>These are from local state.</div>
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
        <div>init_subset_center is: {this.props.init_subset_center}</div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    MAX_POINTS_ANIMATE: state.MAX_POINTS_ANIMATE,
    SCATTER_PLOT_TYPE: state.SCATTER_PLOT_TYPE,
    cont_colormap: state.cont_colormap,
  };
};

export default connect(mapStateToProps, {
  // changeThreeDColormap,
  // updateThreeDColorBy,
})(ScatterPlot);
