import { connect } from 'react-redux';
import { changeFontSize, changeFontFamily } from '../actions';
import ControlsButtonVarOptions from './controls-button-var-options';

const mapStateToProps = state => {
  return {
    font_size: state.fontSize,
    font_family: state.fontFamily,
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
  }
}

const VisibleVarOptions = connect(
  mapStateToProps,
  mapDispatchToProps
)(ControlsButtonVarOptions)

export default VisibleVarOptions