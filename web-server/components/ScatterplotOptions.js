import React from "react";
import { connect } from 'react-redux';
import { 
  setUnselectedPointSize,
  setUnselectedBorderSize,
  setSelectedPointSize,
  setSelectedBorderSize,
  } from 'plugins/slycat-parameter-image/js/actions';
import css from "css/slycat-scatterplot-options.scss";

class ScatterplotOptions extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  render() {
    return (
      <div className={`slycat-scatterplot-options ${this.props.uniqueID}`}>
        <div className='slycat-point-size'>
          <div className='form-row mb-2'>
            <div className='col-2'> </div>
            <div className='col-2 font-weight-bold d-flex justify-content-center'>Point Size</div>
            <div className='col-2 font-weight-bold d-flex justify-content-center'>Border Width</div>
          </div>
          <div className='form-row mb-2'>
            <div className='col-2 font-weight-bold'>
              Unselected
            </div>
            <div className='col-2 d-flex justify-content-center'>
              <input type='number' className='form-control form-control-sm' id='unselected-point-size' 
                max='40' min='1' step='1' style={{width: "70px"}}
                value={this.props.unselected_point_size} 
                onChange={this.props.setUnselectedPointSize}
              />
            </div>
            <div className='col-2 d-flex justify-content-center'>
              <input type='number' className='form-control form-control-sm' id='unselected-border-size' 
                max='40' min='0.1' step='0.1' style={{width: "70px"}}
                value={this.props.unselected_border_size} 
                onChange={this.props.setUnselectedBorderSize}
              />
            </div>
          </div>
          <div className='form-row'>
            <div className='col-2 font-weight-bold'>
              Selected
            </div>
            <div className='col-2 d-flex justify-content-center'>
              <input type='number' className='form-control form-control-sm' id='selected-point-size' 
                max='40' min='1' step='1' style={{width: "70px"}}
                value={this.props.selected_point_size} 
                onChange={this.props.setSelectedPointSize}
              />
            </div>
            <div className='col-2 d-flex justify-content-center'>
              <input type='number' className='form-control form-control-sm' id='selected-border-size' 
                max='40' min='0.1' step='0.1' style={{width: "70px"}}
                value={this.props.selected_border_size} 
                onChange={this.props.setSelectedBorderSize}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    unselected_point_size: state.unselected_point_size,
    unselected_border_size: state.unselected_border_size,
    selected_point_size: state.selected_point_size,
    selected_border_size: state.selected_border_size,
  }
};

export default connect(
  mapStateToProps,
  { 
    setUnselectedPointSize,
    setUnselectedBorderSize,
    setSelectedPointSize,
    setSelectedBorderSize,
  }
)(ScatterplotOptions)