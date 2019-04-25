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

    const barplotHeaderColumns = this.props.x_loadings.map((item, index) => (
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
      </div>
    ));

    const rSquaredStatistics = this.props.x_loadings.map((item, index) => (
      <div className={`barplotCell col${index+1}`} key={index}>
        <div className="wrapper">
          <div className="negativeSpacer spacer" />
          <div className="barplotCellValue">
            {Number(this.props.r2[index]).toFixed(3)}
          </div>
          <div className="positiveSpacer spacer" />
        </div>
      </div>
    ));


    const pStatistics = this.props.x_loadings.map((item, index) => (
      <div className={`barplotCell col${index+1}`} key={index}>
        <div className="wrapper">
          <div className="negativeSpacer spacer" />
          <div className="barplotCellValue">
            {Number(this.props.wilks[index]).toFixed(3)}
          </div>
          <div className="positiveSpacer spacer" />
        </div>
      </div>
    ));

    const negative_bar_width = (value) =>
    {
      return value < 0 ? -100 * value + "px" : "0px";
    }

    const positive_bar_width = (value) =>
    {
      return value > 0 ? 100 * value + "px" : "0px";
    }

    const inputs = this.props.inputs.map((item, inputs_index) => (
      <React.Fragment key={inputs_index}>
        <div className="barplotColumn input">
          <div 
            className={`barplotCell col0 rowInput inputLabel row${inputs_index} variable${this.props.inputs[inputs_index]}`}
            data-loadings_index={inputs_index}
            data-variable={this.props.inputs[inputs_index]}
          >
            <div className="wrapper">
              {this.props.metadata["column-names"][this.props.inputs[inputs_index]]}
            </div>
          </div>
        </div>
        <div className="barplotCanvas input">
          <div 
            className={`barplotRow rowInput row${inputs_index} variable${this.props.inputs[inputs_index]}`}
            data-loadings_index={inputs_index}
            data-variable={this.props.inputs[inputs_index]}
          >
            {this.props.x_loadings.map((item, x_loadings_index) =>
              <div 
                className={`barplotCell rowInput row${x_loadings_index} col${x_loadings_index+1} variable${this.props.inputs[inputs_index]}`}
                key={x_loadings_index}
              >
                <div className="wrapper">
                  <div className="negativeSpacer spacer">
                    <div className={`negative cca${x_loadings_index + 1}`} 
                      style={{width: negative_bar_width(this.props.x_loadings[x_loadings_index][inputs_index])}}
                    />
                  </div>
                  <div className="barplotCellValue">
                    {Number(this.props.x_loadings[x_loadings_index][inputs_index]).toFixed(3)}
                  </div>
                  <div className="positiveSpacer spacer">
                    <div className={`positive cca${x_loadings_index + 1}`} 
                      style={{width: positive_bar_width(this.props.x_loadings[x_loadings_index][inputs_index])}}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </React.Fragment>
    ));

    return (
      <React.Fragment>
        <React.StrictMode>
          <div className="cca-barplot-table">
            <div className='barplotHeader'>
              <div className="barplotRow">
                <div className="barplotHeaderColumn mask col0">
                  <div className="wrapper">&nbsp;</div>
                </div>
                <div className="barplotHeaderColumns">
                  {barplotHeaderColumns}
                </div>
              </div>
              <div className="barplotRow">
                <div className="barplotCell mask col0" id="rsquared-label">
                  <div className="wrapper">R<sup>2</sup></div>
                </div>
                <div className="barplotHeaderColumns">
                  {rSquaredStatistics}
                </div>
              </div>
              <div className="barplotRow">
                <div className="barplotCell mask col0">
                  <div className="wrapper">P</div>
                </div>
                <div className="barplotHeaderColumns">
                  {pStatistics}
                </div>
              </div>
            </div>
            <div className="barplotViewport">
              <div className="barplotGroup inputs">
                {inputs}
              </div>
            </div>
          </div>
        </React.StrictMode>
      </React.Fragment>
    );
  }
}

export default CCABarplot