import {
  CHANGE_FONT_SIZE,
  CHANGE_FONT_FAMILY,
  CHANGE_AXES_VARIABLE_SCALE,
  CHANGE_VARIABLE_ALIAS_LABEL,
  CHANGE_CURRENT_FRAME,
  CHANGE_THREED_COLORMAP,
  UPDATE_THREE_D_COLORVAR,
} from './actions';

const initialState = {
  fontSize: 15,
  fontFamily: "Arial",
  axesVariables: {},
  currentFrame: null,
  threeD_sync: false,
  three_d_colormaps: {},
}

export default function ps_reducer(state = initialState, action) {
  switch (action.type) {
    case CHANGE_FONT_SIZE:
      return Object.assign({}, state, {
        fontSize: action.fontSize
      })
    case CHANGE_FONT_FAMILY:
      return Object.assign({}, state, {
        fontFamily: action.fontFamily
      })
    case CHANGE_AXES_VARIABLE_SCALE:
      return Object.assign({}, state, {
        axesVariables: Object.assign({}, state.axesVariables, {[action.axesVariable]: action.axesScale})
      })
    case CHANGE_VARIABLE_ALIAS_LABEL:
      return Object.assign({}, state, {
        derived: {
          ...state.derived,
          variableAliases: {
            ...state.derived.variableAliases,
            [action.aliasVariable]: action.aliasLabel
          }
        }
      })
    case CHANGE_CURRENT_FRAME:
      return Object.assign({}, state, {
        currentFrame: action.currentFrame
      })
    case CHANGE_THREED_COLORMAP:
      return Object.assign({}, state, {
        threeDColormap: action.threeDColormap
      })
    case UPDATE_THREE_D_COLORVAR:
      return Object.assign({}, state, {
        three_d_colorvars: {
          ...state.three_d_colorvars,
          // We use ES6 computed property syntax so we can update three_d_colormaps[action.uri] with Object.assign() in a concise way
          [action.uri]: action.colorVar
        }
      })

    default:
      return state
  }
}
