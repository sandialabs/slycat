import {
  SET_COLORMAP,
} from 'components/actionsColor';

const initialState = {
  colormap: 'night', // String reprsenting current color map
}

export default function cca_reducer(state = initialState, action) {
  switch (action.type) {
    case SET_COLORMAP:
      return Object.assign({}, state, {
        colormap: action.name
      })
    // Return current state if we get passed an action we don't handle
    default:
      return state
  }
}