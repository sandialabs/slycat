/*
 * action types
 */

export const CHANGE_FONT_SIZE = 'CHANGE_FONT_SIZE'
export const CHANGE_FONT_FAMILY = 'CHANGE_FONT_FAMILY'
export const CHANGE_AXES_VARIABLE_SCALE = 'CHANGE_AXES_VARIABLE_SCALE'
export const CHANGE_VARIABLE_ALIAS_LABEL = 'CHANGE_VARIABLE_ALIAS_LABEL'
export const CHANGE_CURRENT_FRAME = 'CHANGE_CURRENT_FRAME'
export const UPDATE_THREE_D_COLORMAP = 'UPDATE_THREE_D_COLORMAP'

export function changeFontSize(size) {
  return { type: CHANGE_FONT_SIZE, fontSize: size }
}

export function changeFontFamily(family) {
  return { type: CHANGE_FONT_FAMILY, fontFamily: family }
}

export function changeAxesVariableScale(variable, scale) {
  return { type: CHANGE_AXES_VARIABLE_SCALE, axesVariable: variable, axesScale: scale }
}

export function changeVariableAliasLabels(variable, label) {
  return { type: CHANGE_VARIABLE_ALIAS_LABEL, aliasVariable: variable, aliasLabel: label }
}

export function changeCurrentFrame(frame) {
  return { type: CHANGE_CURRENT_FRAME, currentFrame: frame }
}

export function updateThreeDColormap(uri, colormap) {
  return { 
    type: UPDATE_THREE_D_COLORMAP, 
    uri: uri, 
    colormap: colormap,
  }
}