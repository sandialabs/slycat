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

  min_unselected_point_size = 1;
  max_unselected_point_size = 40;
  min_unselected_border_size = 0;
  // Doesn't make sense for thicker border than half of point size 
  // because it's all border by then.
  max_unselected_border_size = this.max_unselected_point_size / 2;

  min_selected_point_size = 2;
  max_selected_point_size = 80;
  min_selected_border_size = 0;
  // Doesn't make sense for thicker border than half of point size 
  // because it's all border by then.
  max_selected_border_size = this.max_selected_point_size / 2;

  point_size_step = 1;
  border_size_step = 0.1;

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
                min={this.min_unselected_point_size}
                max={this.max_unselected_point_size} 
                step={this.point_size_step} 
                value={this.props.unselected_point_size} 
                onChange={this.props.setUnselectedPointSize}
              />
            </div>
            <div className='col-2 d-flex justify-content-center'>
              <input type='number' className='form-control form-control-sm' id='unselected-border-size' style={{width: "70px"}}
                min={this.min_unselected_border_size}
                max={this.max_unselected_border_size} 
                step={this.border_size_step} 
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
                min={this.min_selected_point_size}
                max={this.max_selected_point_size} 
                step={this.point_size_step} 
                value={this.props.selected_point_size} 
                onChange={this.props.setSelectedPointSize}
              />
            </div>
            <div className='col-2 d-flex justify-content-center'>
              <input type='number' className='form-control form-control-sm' id='selected-border-size' style={{width: "70px"}}
                min={this.min_selected_border_size}
                max={this.max_selected_border_size} 
                step={this.border_size_step} 
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