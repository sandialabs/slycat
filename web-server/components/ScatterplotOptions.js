import React from "react";
import { connect } from 'react-redux';
import { 
  setUnselectedPointSize,
  setUnselectedBorderSize,
  setSelectedPointSize,
  setSelectedBorderSize,
  } from 'plugins/slycat-parameter-image/js/actions';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import css from "css/slycat-scatterplot-options.scss";
import { Raycaster } from "three";

export const DEFAULT_UNSELECTED_POINT_SIZE = 8;
export const MIN_UNSELECTED_POINT_SIZE = 1;
export const MAX_UNSELECTED_POINT_SIZE = 40;
export const DEFAULT_UNSELECTED_BORDER_SIZE = 1;
export const MIN_UNSELECTED_BORDER_SIZE = 0;
// Doesn't make sense for thicker border than half of point size 
// because it's all border by then.
export const MAX_UNSELECTED_BORDER_SIZE = (MAX_UNSELECTED_POINT_SIZE / 2) - 0.5;

export const DEFAULT_SELECTED_POINT_SIZE = 16;
export const MIN_SELECTED_POINT_SIZE = 2;
export const MAX_SELECTED_POINT_SIZE = 80;
export const DEFAULT_SELECTED_BORDER_SIZE = 2;
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
            <PointFormat 
              size={this.props.unselected_point_size}
              default_size={DEFAULT_UNSELECTED_POINT_SIZE}
              min_size={MIN_UNSELECTED_POINT_SIZE}
              max_size={MAX_UNSELECTED_POINT_SIZE}
              step={POINT_SIZE_STEP}
              handle_change={this.props.setUnselectedPointSize}
              title_reset='Reset size of unselected points to default.'
            />
            <PointFormat 
              size={this.props.unselected_border_size}
              default_size={DEFAULT_UNSELECTED_BORDER_SIZE}
              min_size={MIN_UNSELECTED_BORDER_SIZE}
              max_size={MAX_UNSELECTED_BORDER_SIZE}
              step={BORDER_SIZE_STEP}
              handle_change={this.props.setUnselectedBorderSize}
              title_reset='Reset border width of unselected points to default.'
            />
          </div>
          <div className='form-row'>
            <div className='col-3 font-weight-bold'>
              Selected Points
            </div>
            <PointFormat 
              size={this.props.selected_point_size}
              default_size={DEFAULT_SELECTED_POINT_SIZE}
              min_size={MIN_SELECTED_POINT_SIZE}
              max_size={MAX_SELECTED_POINT_SIZE}
              step={POINT_SIZE_STEP}
              handle_change={this.props.setSelectedPointSize}
              title_reset='Reset size of selected points to default.'
            />
            <PointFormat 
              size={this.props.selected_border_size}
              default_size={DEFAULT_SELECTED_BORDER_SIZE}
              min_size={MIN_SELECTED_BORDER_SIZE}
              max_size={MAX_SELECTED_BORDER_SIZE}
              step={BORDER_SIZE_STEP}
              handle_change={this.props.setSelectedBorderSize}
              title_reset='Reset border width of selected points to default.'
            />
          </div>
        </div>
      </div>
    );
  }
}

class PointFormat extends React.Component {
  render() {
    return (
      <div className='col-2 d-flex justify-content-center input-group input-group-sm'>
        <input type='number' 
          className={`form-control form-control-sm 
            ${this.props.size != this.props.default_size ? 'edited' : ''}`
          }
          min={this.props.min}
          max={this.props.max} 
          step={this.props.step} 
          value={this.props.size} 
          onChange={this.props.handle_change}
        />
      <div className='input-group-append'>
        <button 
          className='btn btn-outline-secondary' 
          type='button'
          title={this.props.title_reset}
          value={this.props.default_size}
          disabled={this.props.size == this.props.default_size}
          onClick={this.props.handle_change}
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
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