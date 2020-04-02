import React from "react";
import { connect } from 'react-redux';
import { 
  setUnselectedPointSize,
  setUnselectedBorderSize,
  setSelectedPointSize,
  setSelectedBorderSize,
  } from 'plugins/slycat-parameter-image/js/actions';
import css from "css/slycat-scatterplot-options.scss";

export const MIN_UNSELECTED_POINT_SIZE = 1;
export const MAX_UNSELECTED_POINT_SIZE = 40;
export const MIN_UNSELECTED_BORDER_SIZE = 0;
// Doesn't make sense for thicker border than half of point size 
// because it's all border by then.
export const MAX_UNSELECTED_BORDER_SIZE = (MAX_UNSELECTED_POINT_SIZE / 2) - 0.5;

export const MIN_SELECTED_POINT_SIZE = 2;
export const MAX_SELECTED_POINT_SIZE = 80;
export const MIN_SELECTED_BORDER_SIZE = 0;
// Doesn't make sense for thicker border than half of point size 
// because it's all border by then.
export const MAX_SELECTED_BORDER_SIZE = (MAX_SELECTED_POINT_SIZE / 2) - 0.5;

export const POINT_SIZE_STEP = 1;
export const BORDER_SIZE_STEP = 0.1;

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
            <div className='col-3'> </div>
            <div className='col-2 font-weight-bold d-flex justify-content-center'>Point Size</div>
            <div className='col-2 font-weight-bold d-flex justify-content-center'>Border Width</div>
          </div>
          <div className='form-row mb-2'>
            <div className='col-3 font-weight-bold'>
              Unselected Points
            </div>
            <div className='col-2 d-flex justify-content-center'>
              <input type='number' className='form-control form-control-sm' id='unselected-point-size' style={{width: "70px"}}
                min={MIN_UNSELECTED_POINT_SIZE}
                max={MAX_UNSELECTED_POINT_SIZE} 
                step={POINT_SIZE_STEP} 
                value={this.props.unselected_point_size} 
                onChange={this.props.setUnselectedPointSize}
              />
            </div>
            <div className='col-2 d-flex justify-content-center'>
              <input type='number' className='form-control form-control-sm' id='unselected-border-size' style={{width: "70px"}}
                min={MIN_UNSELECTED_BORDER_SIZE}
                max={MAX_UNSELECTED_BORDER_SIZE} 
                step={BORDER_SIZE_STEP} 
                value={this.props.unselected_border_size} 
                onChange={this.props.setUnselectedBorderSize}
              />
            </div>
          </div>
          <div className='form-row'>
            <div className='col-3 font-weight-bold'>
              Selected Points
            </div>
            <div className='col-2 d-flex justify-content-center'>
              <input type='number' className='form-control form-control-sm' id='selected-point-size' style={{width: "70px"}}
                min={MIN_SELECTED_POINT_SIZE}
                max={MAX_SELECTED_POINT_SIZE} 
                step={POINT_SIZE_STEP} 
                value={this.props.selected_point_size} 
                onChange={this.props.setSelectedPointSize}
              />
            </div>
            <div className='col-2 d-flex justify-content-center'>
              <input type='number' className='form-control form-control-sm' id='selected-border-size' style={{width: "70px"}}
                min={MIN_SELECTED_BORDER_SIZE}
                max={MAX_SELECTED_BORDER_SIZE} 
                step={BORDER_SIZE_STEP} 
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