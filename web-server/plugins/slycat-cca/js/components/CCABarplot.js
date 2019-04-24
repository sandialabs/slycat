import React from "react";
import { Provider } from 'react-redux';

class CCABarplot extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      
    };
  }

  render() {
    // Define default button style
    const button_style = 'btn-outline-dark';

    const barplotHeaderColumns = this.props.x_loadings.map((item, index) =>
      <div className={`barplotHeaderColumn col${index+1} cca${index + 1}`} key={index}>
        <div className="wrapper">
          <div className="negativeSpacer spacer" />
          <div className="barplotHeaderColumnLabelWrapper">
            <span className="selectCCAComponent">
              CCA {index + 1}
            </span>
            <span className="sortCCAComponent icon-sort-off" />
          </div>
          <div className="positiveSpacer spacer" />
        </div>
      </div>);


    return (
      <React.Fragment>
        <React.StrictMode>
          <div>alex</div>
          <div id="ccabarplot-table">
            <div className="barplotRow">
              <div className="barplotHeaderColumn mask col0">
                <div className="wrapper">&nbsp;</div>
              </div>
              <div className="barplotHeaderColumns">
                {barplotHeaderColumns}
              </div>
            </div>
          </div>
        </React.StrictMode>
      </React.Fragment>
    );
  }
}

export default CCABarplot