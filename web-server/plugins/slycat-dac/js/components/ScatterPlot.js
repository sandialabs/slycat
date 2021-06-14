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
        <div>MAX_POINTS_ANIMATE is: {this.props.MAX_POINTS_ANIMATE}</div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    MAX_POINTS_ANIMATE: state.MAX_POINTS_ANIMATE,
  };
};

export default connect(mapStateToProps, {
  // changeThreeDColormap,
  // updateThreeDColorBy,
})(ScatterPlot);
