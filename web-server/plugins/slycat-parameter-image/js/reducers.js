import {
  CHANGE_FONT_SIZE,
  CHANGE_FONT_FAMILY,
  CHANGE_AXES_VARIABLE_SCALE,
  CHANGE_VARIABLE_ALIAS_LABEL,
  REMOVE_VARIABLE_ALIAS_LABEL,
  CHANGE_CURRENT_FRAME,
  CHANGE_THREED_COLORMAP,
  UPDATE_THREE_D_COLORBY,
  UPDATE_THREE_D_COLORBY_OPTIONS,
  UPDATE_THREE_D_CAMERAS,
  UPDATE_THREE_D_SYNC,
  SET_UNSELECTED_POINT_SIZE,
  SET_UNSELECTED_BORDER_SIZE,
  SET_SELECTED_POINT_SIZE,
  SET_SELECTED_BORDER_SIZE,
} from './actions';

import { 
  MIN_UNSELECTED_POINT_SIZE,
  MAX_UNSELECTED_POINT_SIZE,
  MIN_SELECTED_POINT_SIZE,
  MAX_SELECTED_POINT_SIZE,
  MIN_UNSELECTED_BORDER_SIZE,
  MAX_UNSELECTED_BORDER_SIZE,
  MIN_SELECTED_BORDER_SIZE,
  MAX_SELECTED_BORDER_SIZE
} from "components/ScatterplotOptions";

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
    
    case REMOVE_VARIABLE_ALIAS_LABEL:
      let variableAliasesClone = Object.assign({}, state.derived.variableAliases);
      delete variableAliasesClone[action.aliasVariable];

      return Object.assign({}, state, {
        derived: {
          ...state.derived,
          variableAliases: variableAliasesClone
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

    case UPDATE_THREE_D_COLORBY:
      return Object.assign({}, state, {
        three_d_colorvars: {
          ...state.three_d_colorvars,
          // We use ES6 computed property syntax so we can update three_d_colormaps[action.uri] with Object.assign() in a concise way
          [action.uri]: action.colorBy
        }
      })

    case UPDATE_THREE_D_COLORBY_OPTIONS:
      // console.log('UPDATE_THREE_D_COLORBY_OPTIONS');
      return Object.assign({}, state, {
        derived: {
          ...state.derived,
          three_d_colorby_options: {
            ...state.derived.three_d_colorby_options,
            [action.uri]: action.options
          }
        }
      })
      
    case UPDATE_THREE_D_CAMERAS:
      let newCameras = {};
      for(let camera of action.cameras)
      {
        newCameras[camera.uri] = {
          position: camera.camera.getPosition(),
          focalPoint: camera.camera.getFocalPoint(),
          viewUp: camera.camera.getViewUp(),
        }
      }

      return Object.assign({}, state, {
        three_d_cameras: {
          ...state.three_d_cameras,
          // We use ES6 computed property syntax so we can update three_d_colormaps[action.uri] with Object.assign() in a concise way
          // [action.uri]: action.camera
          ...newCameras
        }
      })
    
    case UPDATE_THREE_D_SYNC:
      return Object.assign({}, state, {
        threeD_sync: action.threeD_sync
      })

    case SET_UNSELECTED_POINT_SIZE:
      let newUnselectedSizes = { unselected_point_size: action.size, }
      // Don't change value if user entered NaN or too small value or too large
      if(Number.isNaN(newUnselectedSizes.unselected_point_size) || 
         newUnselectedSizes.unselected_point_size < MIN_UNSELECTED_POINT_SIZE ||
         newUnselectedSizes.unselected_point_size > MAX_UNSELECTED_POINT_SIZE
      )
      {
        newUnselectedSizes.unselected_point_size = state.unselected_point_size;
      }
      // Increase selected point size if it's same or smaller than unselected
      if(newUnselectedSizes.unselected_point_size >= state.selected_point_size)
      {
        newUnselectedSizes.selected_point_size = newUnselectedSizes.unselected_point_size + 1;
      }
      // Decrease unselected border size if it's half or more of unselected point size
      if(state.unselected_border_size > (newUnselectedSizes.unselected_point_size / 2) - 0.5)
      {
        newUnselectedSizes.unselected_border_size = (newUnselectedSizes.unselected_point_size / 2) - 0.5;
      }

      return Object.assign({}, state, newUnselectedSizes)

    case SET_UNSELECTED_BORDER_SIZE:
      let newUnselectedBorderSizes = { unselected_border_size: action.size, }
      // Don't change value if user entered NaN or too small value or too large
      if(Number.isNaN(newUnselectedBorderSizes.unselected_border_size) || 
         newUnselectedBorderSizes.unselected_border_size < MIN_UNSELECTED_BORDER_SIZE ||
         newUnselectedBorderSizes.unselected_border_size > MAX_UNSELECTED_BORDER_SIZE
      )
      {
        newUnselectedBorderSizes.unselected_border_size = state.unselected_border_size;
      }
      // Decrease border size if it's half or more of point size
      if(newUnselectedBorderSizes.unselected_border_size > (state.unselected_point_size / 2) - 0.5)
      {
        newUnselectedBorderSizes.unselected_border_size = (state.unselected_point_size / 2) - 0.5;
      }

      return Object.assign({}, state, newUnselectedBorderSizes)

    case SET_SELECTED_POINT_SIZE:
      let newSelectedSizes = { selected_point_size: action.size, }
      // Don't change value if user entered NaN or too small value or too large
      if(Number.isNaN(newSelectedSizes.selected_point_size) || 
         newSelectedSizes.selected_point_size < MIN_SELECTED_POINT_SIZE ||
         newSelectedSizes.selected_point_size > MAX_SELECTED_POINT_SIZE
      )
      {
        newSelectedSizes.selected_point_size = state.selected_point_size;
      }
      // Decrease unselected point size if it's same or larger than selected
      if(newSelectedSizes.selected_point_size <= state.unselected_point_size)
      {
        newSelectedSizes.unselected_point_size = newSelectedSizes.selected_point_size - 1;
      }
      // Decrease unselected border size if it's half or more of unselected point size
      if(state.unselected_border_size > (newSelectedSizes.unselected_point_size / 2) - 0.5)
      {
        newSelectedSizes.unselected_border_size = (newSelectedSizes.unselected_point_size / 2) - 0.5;
      }
      // Decrease selected border size if it's half or more of selected point size
      if(state.selected_border_size > (newSelectedSizes.selected_point_size / 2) - 0.5)
      {
        newSelectedSizes.selected_border_size = (newSelectedSizes.selected_point_size / 2) - 0.5;
      }

      return Object.assign({}, state, newSelectedSizes)

    case SET_SELECTED_BORDER_SIZE:
      let newSelectedBorderSizes = { selected_border_size: action.size, }
      // Don't change value if user entered NaN or too small value or too large
      if(Number.isNaN(newSelectedBorderSizes.selected_border_size) || 
         newSelectedBorderSizes.selected_border_size < MIN_SELECTED_BORDER_SIZE ||
         newSelectedBorderSizes.selected_border_size > MAX_SELECTED_BORDER_SIZE
      )
      {
        newSelectedBorderSizes.selected_border_size = state.selected_border_size;
      }
      // Decrease border size if it's half or more of point size
      if(newSelectedBorderSizes.selected_border_size > (state.selected_point_size / 2) - 0.5)
      {
        newSelectedBorderSizes.selected_border_size = (state.selected_point_size / 2) - 0.5;
      }

      return Object.assign({}, state, newSelectedBorderSizes)

    default:
      return state
  }
}
