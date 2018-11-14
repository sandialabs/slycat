import { connect } from 'react-redux';
import { changeFontSize } from '../actions';
import ControlsButtonVarOptions from './controls-button-var-options';

const mapStateToProps = state => {
  return {
    font_size: state.fontSize
  }
}

const mapDispatchToProps = dispatch => {
  return {
    onFontSizeChange: event => {
      dispatch(changeFontSize(event.target.value))
    }
  }
}

const VisibleVarOptions = connect(
  mapStateToProps,
  mapDispatchToProps
)(ControlsButtonVarOptions)

export default VisibleVarOptions