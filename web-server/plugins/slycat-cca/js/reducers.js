import {
  CHANGE_VARIABLE_SELECTION,
} from './actions';

const initialState = {
  colormap: 'night',
}

export default function slycat(state = initialState, action) {
  switch (action.type) {
    case CHANGE_VARIABLE_SELECTION:
      return Object.assign({}, state, {
        'variable-selection': action.variableSelection
      })
    // case CHANGE_FONT_FAMILY:
    //   return Object.assign({}, state, {
    //     fontFamily: action.fontFamily
    //   })
    // case CHANGE_AXES_VARIABLE_SCALE:
    //   return Object.assign({}, state, {
    //     axesVariables: Object.assign({}, state.axesVariables, {[action.axesVariable]: action.axesScale})
    //   })
    default:
      return state
  }
}
