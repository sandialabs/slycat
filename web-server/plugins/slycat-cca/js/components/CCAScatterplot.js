import React from "react";
import { Provider } from 'react-redux';

import api_root from "js/slycat-api-root";

class CCAScatterplot extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      component: this.props.component,
    };

    // Create a ref to the .cca-barplot-table
    this.cca_scatterplot = React.createRef();
  }

  componentDidMount() {
    let self = this;
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    
  }

  resize_canvas = () =>
  {
    let self = this;
  }

  clickComponent = (index, e) =>
  {
    this.setState({component: index});
  }

  render() {

    return (
      <React.Fragment>
        <React.StrictMode>
          <div id="cca_scatterplot" ref={this.cca_scatterplot}>this is the scatterplot</div>
        </React.StrictMode>
      </React.Fragment>
    );
  }
}

export default CCAScatterplot
