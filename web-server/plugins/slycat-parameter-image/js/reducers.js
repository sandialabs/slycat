import {
  CHANGE_FONT_SIZE,
  CHANGE_FONT_FAMILY,
  CHANGE_AXES_VARIABLE_SCALE,
  CHANGE_VARIABLE_ALIAS_LABEL,
  REMOVE_VARIABLE_ALIAS_LABEL,
  REMOVE_ALL_VARIABLE_ALIAS_LABELS,
  CHANGE_CURRENT_FRAME,
  CHANGE_THREED_COLORMAP,
  UPDATE_THREE_D_COLORBY,
  UPDATE_THREE_D_COLORBY_OPTIONS,
  SET_THREE_D_COLORBY_RANGE,
  SET_THREE_D_COLORBY_LEGEND,
  UPDATE_THREE_D_CAMERAS,
  UPDATE_THREE_D_SYNC,
  SET_UNSELECTED_POINT_SIZE,
  SET_UNSELECTED_BORDER_SIZE,
  SET_SELECTED_POINT_SIZE,
  SET_SELECTED_BORDER_SIZE,
  SET_VARIABLE_RANGE,
  CLEAR_VARIABLE_RANGE,
  CLEAR_ALL_VARIABLE_RANGES,
  SET_X_VALUES,
  SET_Y_VALUES,
  SET_V_VALUES,
  SET_X_INDEX,
  SET_Y_INDEX,
  SET_V_INDEX,
  SET_OPEN_MEDIA,
  SET_MEDIA_SIZE_POSITION,
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

import { 
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_FAMILY,
  } from './Components/ControlsButtonVarOptions';
import { AnimationActionLoopStyles } from 'three';
import _ from 'lodash';

const initialState = {
  fontSize: DEFAULT_FONT_SIZE,
  fontFamily: DEFAULT_FONT_FAMILY,
  axesVariables: {},
  currentFrame: {},
  threeD_sync: false,
  three_d_colormaps: {},
  open_media: [],
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
    
    case REMOVE_ALL_VARIABLE_ALIAS_LABELS:
      return Object.assign({}, state, {
        derived: {
          ...state.derived,
          variableAliases: {}
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
          [action.uid]: action.colorBy
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
    
    case SET_THREE_D_COLORBY_RANGE:
      // console.log('SET_THREE_D_COLORBY_RANGE');
      return Object.assign({}, state, {
        derived: {
          ...state.derived,
          three_d_colorby_range: {
            ...state.derived.three_d_colorby_range,
            [action.uri]: {
              ...state.derived.three_d_colorby_range[action.uri],
              [action.colorBy]: action.range
            }
          }
        }
      })
    
    case SET_THREE_D_COLORBY_LEGEND:
      // console.log('SET_THREE_D_COLORBY_LEGEND');
      return Object.assign({}, state, {
        derived: {
          ...state.derived,
          three_d_colorby_legends: {
            ...state.derived.three_d_colorby_legends,
            [action.uid]: {
              ...state.derived.three_d_colorby_legends[action.uid],
              width: action.width,
              height: action.height,
            }
          }
        }
      })
      
    case UPDATE_THREE_D_CAMERAS:
      let newCameras = {};
      for(let camera of action.cameras)
      {
        newCameras[camera.uid] = {
          position: camera.camera.getPosition(),
          focalPoint: camera.camera.getFocalPoint(),
          viewUp: camera.camera.getViewUp(),
          clippingRange: camera.camera.getClippingRange(),
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
    
    case SET_VARIABLE_RANGE:
      return Object.assign({}, state, {
        variableRanges: {
          ...state.variableRanges,
          [action.index]: {
            ...state.variableRanges[action.index],
            [action.minOrMax]: action.value
          }
        }
      })
    
    case CLEAR_VARIABLE_RANGE:
      let variableRangesClone = Object.assign({}, state.variableRanges);
      if(variableRangesClone[action.index] != undefined)
      {
        delete variableRangesClone[action.index][action.minOrMax];
        // Delete the entire entry if there is no other value in it (min or max)
        if(Object.keys(variableRangesClone[action.index]).length === 0)
        {
          delete variableRangesClone[action.index];
        }
      }

      return Object.assign({}, state, {
        variableRanges: variableRangesClone
      })
    
    case CLEAR_ALL_VARIABLE_RANGES:
      return Object.assign({}, state, {
        variableRanges: {}
      })

    case SET_X_VALUES:
      return Object.assign({}, state, {
        derived: {
          ...state.derived,
          xValues: action.values
        }
      })

    case SET_Y_VALUES:
      return Object.assign({}, state, {
        derived: {
          ...state.derived,
          yValues: action.values
        }
      })
      
    case SET_V_VALUES:
      return Object.assign({}, state, {
        derived: {
          ...state.derived,
          vValues: action.values
        }
      })
      
    case SET_X_INDEX:
      return Object.assign({}, state, {
        x_index: action.index
      })
      
    case SET_Y_INDEX:
      return Object.assign({}, state, {
        y_index: action.index
      })
      
    case SET_V_INDEX:
      return Object.assign({}, state, {
        v_index: action.index
      })
      
    case SET_OPEN_MEDIA:
      return Object.assign({}, state, {
        open_media: action.open_media
      })
      
    case SET_MEDIA_SIZE_POSITION:
      let cloned_deep_open_media = _.cloneDeep(state.open_media);
      const match = cloned_deep_open_media.findIndex(element => element.uid == action.media_size_position.uid);
      cloned_deep_open_media[match] = Object.assign({}, cloned_deep_open_media[match], action.media_size_position);
      return Object.assign({}, state, {
        open_media: cloned_deep_open_media
      })

    default:
      return state
  }
}
