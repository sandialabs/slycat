import React from "react";
import { connect } from "react-redux";
// import { changeThreeDColormap, updateThreeDColorBy } from "../actions";

class ScatterPlot extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  render() {

    return (
      <div>This is the React scatter plot.</div>
    );
  }
}

// const mapStateToProps = (state) => {
//   return {
    
//   };
// };

// export default connect(mapStateToProps, {
//   // changeThreeDColormap,
//   // updateThreeDColorBy,
// })(ScatterPlot);

export default ScatterPlot;
