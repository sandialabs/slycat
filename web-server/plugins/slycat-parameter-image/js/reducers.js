import {
  CHANGE_FONT_SIZE,
  CHANGE_FONT_FAMILY,
} from './actions';

const initialState = {
  fontSize: 12,
  fontFamily: "Arial"
}

export default function slycat(state = initialState, action) {
  switch (action.type) {
    case CHANGE_FONT_SIZE:
      return Object.assign({}, state, {
        fontSize: action.fontSize
      })
    case CHANGE_FONT_FAMILY:
      return Object.assign({}, state, {
        fontFamily: action.fontFamily
      })
    default:
      return state
  }
}
