import ControlsDropdownColor from "components/ControlsDropdownColor"

/*
 * action types
 */

export const CHANGE_FONT_SIZE = 'CHANGE_FONT_SIZE'
export const CHANGE_FONT_FAMILY = 'CHANGE_FONT_FAMILY'
export const CHANGE_AXES_VARIABLE_SCALE = 'CHANGE_AXES_VARIABLE_SCALE'
export const CHANGE_VARIABLE_ALIAS_LABEL = 'CHANGE_VARIABLE_ALIAS_LABEL'
export const REMOVE_VARIABLE_ALIAS_LABEL = 'REMOVE_VARIABLE_ALIAS_LABEL'
export const CHANGE_CURRENT_FRAME = 'CHANGE_CURRENT_FRAME'
export const CHANGE_THREED_COLORMAP = 'CHANGE_THREED_COLORMAP'
export const UPDATE_THREE_D_COLORBY = 'UPDATE_THREE_D_COLORBY'
export const UPDATE_THREE_D_COLORBY_OPTIONS = 'UPDATE_THREE_D_COLORBY_OPTIONS'
export const UPDATE_THREE_D_CAMERAS = 'UPDATE_THREE_D_CAMERAS'
export const UPDATE_THREE_D_SYNC = 'UPDATE_THREE_D_SYNC'
export const SET_UNSELECTED_POINT_SIZE = 'SET_UNSELECTED_POINT_SIZE'
export const SET_UNSELECTED_BORDER_SIZE = 'SET_UNSELECTED_BORDER_SIZE'
export const SET_SELECTED_POINT_SIZE = 'SET_SELECTED_POINT_SIZE'
export const SET_SELECTED_BORDER_SIZE = 'SET_SELECTED_BORDER_SIZE'
export const SET_VARIABLE_RANGE = 'SET_VARIABLE_RANGE'
export const CLEAR_VARIABLE_RANGE = 'CLEAR_VARIABLE_RANGE'

export function changeFontSize(event) {
  return { 
    type: CHANGE_FONT_SIZE, 
    fontSize: event.currentTarget.value 
  }
}

export function changeFontFamily(event) {
  return { 
    type: CHANGE_FONT_FAMILY, 
    fontFamily: event.currentTarget.innerText 
  }
}

export function changeAxesVariableScale(event) {
  return { 
    type: CHANGE_AXES_VARIABLE_SCALE, 
    axesVariable: event.currentTarget.name,
    axesScale: event.currentTarget.value,  
  }
}

export function changeVariableAliasLabels(event) {
  let labelTrimmed = event.currentTarget.value.trim();
  if(labelTrimmed == '')
  {
    return {
      type: REMOVE_VARIABLE_ALIAS_LABEL, 
      aliasVariable: event.currentTarget.name
    }
  }
  return { 
    type: CHANGE_VARIABLE_ALIAS_LABEL, 
    aliasVariable: event.currentTarget.name, 
    aliasLabel: labelTrimmed 
  }
}

export function changeCurrentFrame(frame) {
  return { 
    type: CHANGE_CURRENT_FRAME, 
    currentFrame: frame 
  }
}

export function changeThreeDColormap(label, key) {
  return { 
    type: CHANGE_THREED_COLORMAP, 
    threeDColormap: key 
  }
}

export function updateThreeDColorBy(uri, colorBy) {
  return { 
    type: UPDATE_THREE_D_COLORBY, 
    uri: uri, 
    colorBy: colorBy,
  }
}

export function updateThreeDColorByOptions(uri, options) {
  return {
    type: UPDATE_THREE_D_COLORBY_OPTIONS,
    uri: uri,
    options: options,
  }
}

export function updateThreeDCameras(cameras) {
  return { 
    type: UPDATE_THREE_D_CAMERAS, 
    cameras: cameras,
    // Throttle this action to only invoke it once every x milliseconds
    // because it gets called very often as the user interacts with a
    // 3D model, and that overwhelms the browser as it tries to bookmark
    // the state constantly.
    meta: {
      throttle: 1500
    },
  }
}

export function updateThreeDSync(threeD_sync) {
  return { 
    type: UPDATE_THREE_D_SYNC, 
    threeD_sync: threeD_sync 
  }
}

export function setUnselectedPointSize(event) {
  return { type: SET_UNSELECTED_POINT_SIZE, size: parseFloat(event.currentTarget.value) }
}

export function setUnselectedBorderSize(event) {
  return { type: SET_UNSELECTED_BORDER_SIZE, size: parseFloat(event.currentTarget.value) }
}

export function setSelectedPointSize(event) {
  return { type: SET_SELECTED_POINT_SIZE, size: parseFloat(event.currentTarget.value) }
}

export function setSelectedBorderSize(event) {
  return { type: SET_SELECTED_BORDER_SIZE, size: parseFloat(event.currentTarget.value) }
}

export function setVariableRange(index, value, minOrMax) {
  return { type: SET_VARIABLE_RANGE, index: index, value: value, minOrMax: minOrMax }
}

export function clearVariableRange(index, minOrMax) {
  return { type: CLEAR_VARIABLE_RANGE, index: index, minOrMax: minOrMax }
}
