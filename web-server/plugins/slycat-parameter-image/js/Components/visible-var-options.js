import { connect } from 'react-redux';
import { changeFontSize, changeFontFamily, changeAxesVariableScale } from '../actions';
import ControlsButtonVarOptions from './controls-button-var-options';

const mapStateToProps = state => {
  return {
    font_size: state.fontSize,
    font_family: state.fontFamily,
    axes_variables_scale: state.axesVariables,
  }
}

const mapDispatchToProps = dispatch => {
  return {
    onFontSizeChange: event => {
      dispatch(changeFontSize(event.target.value))
    },
    onFontFamilyChange: event => {
      dispatch(changeFontFamily(event.target.innerText))
    },
    onAxesVariableScaleChange: event => {
      dispatch(changeAxesVariableScale(event.target.name, event.target.value))
    },
  }
}

const VisibleVarOptions = connect(
  mapStateToProps,
  mapDispatchToProps
)(ControlsButtonVarOptions)

export default VisibleVarOptions