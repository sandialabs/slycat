export const CHANGE_FONT_SIZE = 'CHANGE_FONT_SIZE'
export const CHANGE_FONT_FAMILY = 'CHANGE_FONT_FAMILY'
export const CHANGE_AXES_VARIABLE_SCALE = 'CHANGE_AXES_VARIABLE_SCALE'
export const CHANGE_VARIABLE_ALIAS_LABEL = 'CHANGE_VARIABLE_ALIAS_LABEL'
export const REMOVE_VARIABLE_ALIAS_LABEL = 'REMOVE_VARIABLE_ALIAS_LABEL'
export const REMOVE_ALL_VARIABLE_ALIAS_LABELS = 'REMOVE_ALL_VARIABLE_ALIAS_LABELS'
export const CHANGE_CURRENT_FRAME = 'CHANGE_CURRENT_FRAME'
export const CHANGE_THREED_COLORMAP = 'CHANGE_THREED_COLORMAP'
export const UPDATE_THREE_D_COLORBY = 'UPDATE_THREE_D_COLORBY'
export const UPDATE_THREE_D_COLORBY_OPTIONS = 'UPDATE_THREE_D_COLORBY_OPTIONS'
export const SET_THREE_D_COLORBY_RANGE = 'SET_THREE_D_COLORBY_RANGE'
export const UPDATE_THREE_D_CAMERAS = 'UPDATE_THREE_D_CAMERAS'
export const UPDATE_THREE_D_SYNC = 'UPDATE_THREE_D_SYNC'
export const SET_UNSELECTED_POINT_SIZE = 'SET_UNSELECTED_POINT_SIZE'
export const SET_UNSELECTED_BORDER_SIZE = 'SET_UNSELECTED_BORDER_SIZE'
export const SET_SELECTED_POINT_SIZE = 'SET_SELECTED_POINT_SIZE'
export const SET_SELECTED_BORDER_SIZE = 'SET_SELECTED_BORDER_SIZE'
export const SET_VARIABLE_RANGE = 'SET_VARIABLE_RANGE'
export const CLEAR_VARIABLE_RANGE = 'CLEAR_VARIABLE_RANGE'
export const CLEAR_ALL_VARIABLE_RANGES = 'CLEAR_ALL_VARIABLE_RANGES'
export const SET_X_VALUES = 'SET_X_VALUES'
export const SET_Y_VALUES = 'SET_Y_VALUES'
export const SET_V_VALUES = 'SET_V_VALUES'
export const SET_X_INDEX = 'SET_X_INDEX'
export const SET_Y_INDEX = 'SET_Y_INDEX'
export const SET_V_INDEX = 'SET_V_INDEX'
export const SET_OPEN_MEDIA = 'SET_OPEN_MEDIA'
export const SET_MEDIA_SIZE_POSITION = 'SET_MEDIA_SIZE_POSITION'


export function changeFontSize(event) {
  return { 
    type: CHANGE_FONT_SIZE, 
    fontSize: event.currentTarget.value 
  }
}

export function changeFontFamily(event) {
  let fontFamily = event.currentTarget.value != undefined ? 
    event.currentTarget.value : event.currentTarget.dataset.value;
  return { 
    type: CHANGE_FONT_FAMILY, 
    fontFamily: fontFamily
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
  let label = event.currentTarget.value;
  if(label == '')
  {
    return {
      type: REMOVE_VARIABLE_ALIAS_LABEL, 
      aliasVariable: event.currentTarget.name
    }
  }
  return { 
    type: CHANGE_VARIABLE_ALIAS_LABEL, 
    aliasVariable: event.currentTarget.name, 
    aliasLabel: label 
  }
}

export function clearAllVariableAliasLabels() {
  return { type: REMOVE_ALL_VARIABLE_ALIAS_LABELS }
}

export function changeCurrentFrame(currentFrame) {
  return { 
    type: CHANGE_CURRENT_FRAME, 
    currentFrame 
  }
}

export function changeThreeDColormap(threeDColormap) {
  return { 
    type: CHANGE_THREED_COLORMAP, 
    threeDColormap 
  }
}

export function updateThreeDColorBy(uid, colorBy) {
  return { 
    type: UPDATE_THREE_D_COLORBY, 
    uid, 
    colorBy,
  }
}

export function updateThreeDColorByOptions(uri, options) {
  return {
    type: UPDATE_THREE_D_COLORBY_OPTIONS,
    uri,
    options,
  }
}

export function setThreeDColorByRange(uri, colorBy, range) {
  return {
    type: SET_THREE_D_COLORBY_RANGE,
    uri,
    colorBy,
    range,
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
    threeD_sync 
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

export function clearAllVariableRanges() {
  return { type: CLEAR_ALL_VARIABLE_RANGES }
}

export function setXValues(values) {
  return { type: SET_X_VALUES, values }
}

export function setYValues(values) {
  return { type: SET_Y_VALUES, values }
}

export function setVValues(values) {
  return { type: SET_V_VALUES, values }
}

export function setXIndex(index) {
  return { type: SET_X_INDEX, index }
}

export function setYIndex(index) {
  return { type: SET_Y_INDEX, index }
}

export function setVIndex(index) {
  return { type: SET_V_INDEX, index }
}

export function setOpenMedia(open_media) {
  return { type: SET_OPEN_MEDIA, open_media }
}

export function setMediaSizePosition(media_size_position) {
  return { type: SET_MEDIA_SIZE_POSITION, media_size_position }
}
