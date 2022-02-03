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
  ADJUST_THREE_D_VARIABLE_DATA_RANGE,
  SET_THREE_D_VARIABLE_USER_RANGE,
  CLEAR_THREE_D_VARIABLE_USER_RANGE,
  CLEAR_ALL_THREE_D_VARIABLE_USER_RANGES,
  SET_X_VALUES,
  SET_Y_VALUES,
  SET_V_VALUES,
  SET_MEDIA_VALUES,
  SET_X_INDEX,
  SET_Y_INDEX,
  SET_V_INDEX,
  SET_MEDIA_INDEX,
  SET_OPEN_MEDIA,
  UPDATE_CLOSED_MEDIA,
  SET_HIDDEN_SIMULATIONS,
  SET_MANUALLY_HIDDEN_SIMULATIONS,
  SET_MEDIA_SIZE_POSITION,
  SET_ACTIVE_FILTERS,
  TOGGLE_SYNC_SCALING,
  TOGGLE_SYNC_THREE_D_COLORVAR,
  SET_SELECTED_SIMULATIONS,
  SET_USER_ROLE,
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
              // action.range is an array, so we clone it to prevent the code that passed it from updating it
              [action.colorBy]: action.range.slice(0)
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
    
    case ADJUST_THREE_D_VARIABLE_DATA_RANGE:
      let current = state.three_d_variable_data_ranges[action.name];
      let newMin = action.range[0];
      let newMax = action.range[1];

      const range = {
        min: current ? Math.min(current.min, newMin) : newMin,
        max: current ? Math.max(current.max, newMax) : newMax,
      };

      return Object.assign({}, state, {
        three_d_variable_data_ranges: {
          ...state.three_d_variable_data_ranges,
          [action.name]: range
        }
      })
    
    case SET_THREE_D_VARIABLE_USER_RANGE:
      return Object.assign({}, state, {
        three_d_variable_user_ranges: {
          ...state.three_d_variable_user_ranges,
          [action.name]: {
            ...state.three_d_variable_user_ranges[action.name],
            [action.minOrMax]: action.value
          }
        }
      })
    
    case CLEAR_THREE_D_VARIABLE_USER_RANGE:
      let three_d_variable_user_ranges_clone = Object.assign({}, state.three_d_variable_user_ranges);
      if(three_d_variable_user_ranges_clone[action.name] != undefined)
      {
        delete three_d_variable_user_ranges_clone[action.name][action.minOrMax];
        // Delete the entire entry if there is no other value in it (min or max)
        if(Object.keys(three_d_variable_user_ranges_clone[action.name]).length === 0)
        {
          delete three_d_variable_user_ranges_clone[action.name];
        }
      }

      return Object.assign({}, state, {
        three_d_variable_user_ranges: three_d_variable_user_ranges_clone
      })
    
    case CLEAR_ALL_THREE_D_VARIABLE_USER_RANGES:
      return Object.assign({}, state, {
        three_d_variable_user_ranges: {}
      })

    case SET_X_VALUES:
      return Object.assign({}, state, {
        derived: {
          ...state.derived,
          xValues: action.values.slice(0)
        }
      })

    case SET_Y_VALUES:
      return Object.assign({}, state, {
        derived: {
          ...state.derived,
          yValues: action.values.slice(0)
        }
      })
      
    case SET_V_VALUES:
      return Object.assign({}, state, {
        derived: {
          ...state.derived,
          vValues: action.values.slice(0)
        }
      })
      
    case SET_MEDIA_VALUES:
      return Object.assign({}, state, {
        derived: {
          ...state.derived,
          mediaValues: action.values.slice(0)
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
      
    case SET_MEDIA_INDEX:
      return Object.assign({}, state, {
        media_index: action.index
      })
      
    case SET_OPEN_MEDIA:
      return Object.assign({}, state, {
        open_media: action.open_media.slice(0)
      })
    
    case UPDATE_CLOSED_MEDIA:
      // Make sure we can find the uid in current state's open_media array
      const open_media_matches = state.open_media.filter(element => element.uid == action.uid);
      if(open_media_matches.length)
      {
        const open_media = open_media_matches[0];
        // If it's 3D media, add its camera params and color by variable
        if(open_media.threeD)
        {
          open_media.three_d_camera = state.three_d_cameras[open_media.uid];
          open_media.three_d_colorvar = state.three_d_colorvars[open_media.uid];
        }
        // If we don't have an entry for this closed media, just add it. 
        // Otherwise, replace it.
        let new_closed_media = _.cloneDeep(state.closed_media)
          // Remove existing entry if it's already there
          .filter(element => element.index != open_media.index || element.media_index != open_media.media_index)
          ;
        // Add new closed media entry
        new_closed_media.push(open_media);
        return Object.assign({}, state, {
          closed_media: new_closed_media
        })
      }
      // If we can't find a match of the uid, do nothing.
      return state;
      
    case SET_HIDDEN_SIMULATIONS:
      return Object.assign({}, state, {
        hidden_simulations: action.hidden_simulations.slice(0)
      })
      
    case SET_MANUALLY_HIDDEN_SIMULATIONS:
      return Object.assign({}, state, {
        manually_hidden_simulations: action.manually_hidden_simulations.slice(0)
      })
      
    case SET_MEDIA_SIZE_POSITION:
      let cloned_deep_open_media = _.cloneDeep(state.open_media);
      const match = cloned_deep_open_media.findIndex(element => element.uid == action.media_size_position.uid);
      cloned_deep_open_media[match] = Object.assign({}, cloned_deep_open_media[match], action.media_size_position);
      // If "Sync Scaling" is enabled and we are working with the currentFrame (i.e., highlighted frame),
      // go through all selected media and scale it accordingly
      if(state.sync_scaling && action.media_size_position.uid == state.currentFrame.uid)
      {
        // console.group(`Sync Scaling is enabled, so will scale rest of media too.`);
        cloned_deep_open_media.forEach(function(currentMedia, index, array) {
          // console.debug(`currentMedia is %o`, currentMedia);
          // Skip the target media since it's already been scaled
          if(currentMedia.uid == action.media_size_position.uid) {
            // console.debug(`skipping target media %o`, currentMedia);
            return;
          }
          // Skip unselected media
          // if(state.selected_simulations.indexOf(currentMedia.index) == -1)
          // {
          //   // console.debug(`skipping unselected media %o`, currentMedia);
          //   return;
          // }

          // console.debug(`Calculating media size for %o`, currentMedia);
          const ratio = currentMedia.ratio ? currentMedia.ratio : 1;
          const newWidth = action.media_size_position.width;
          // Set width same as target width
          currentMedia.width = newWidth;
          // Set height based on current media's aspect ratio. 
          // Need to subtract 2 from newWidth to get width of contained media.
          // Adding 22 to account for 1px top and 1px bottom borders and 20px bottom footer.
          currentMedia.height = ((newWidth - 2) / ratio) + 22;

        });
        // console.groupEnd();
      }
      return Object.assign({}, state, {
        open_media: cloned_deep_open_media
      })
    
    case SET_ACTIVE_FILTERS:
      return Object.assign({}, state, {
        active_filters: action.activeFilters.slice(0)
      })
    
    case TOGGLE_SYNC_SCALING:
      return Object.assign({}, state, {
        sync_scaling: !state.sync_scaling
      })
    
    case TOGGLE_SYNC_THREE_D_COLORVAR:
      return Object.assign({}, state, {
        sync_threeD_colorvar: !state.sync_threeD_colorvar
      })
    
    case SET_SELECTED_SIMULATIONS:
      return Object.assign({}, state, {
        selected_simulations: action.simulations.slice(0)
      })

    case SET_USER_ROLE:
      return Object.assign({}, state, {
        derived: {
          ...state.derived,
          userRole: action.role
        }
      })

    default:
      return state
  }
}
