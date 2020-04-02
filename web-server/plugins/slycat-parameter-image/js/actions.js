/*
 * action types
 */

export const CHANGE_FONT_SIZE = 'CHANGE_FONT_SIZE'
export const CHANGE_FONT_FAMILY = 'CHANGE_FONT_FAMILY'
export const CHANGE_AXES_VARIABLE_SCALE = 'CHANGE_AXES_VARIABLE_SCALE'
export const CHANGE_VARIABLE_ALIAS_LABEL = 'CHANGE_VARIABLE_ALIAS_LABEL'
export const SET_UNSELECTED_POINT_SIZE = 'SET_UNSELECTED_POINT_SIZE'
export const SET_UNSELECTED_BORDER_SIZE = 'SET_UNSELECTED_BORDER_SIZE'
export const SET_SELECTED_POINT_SIZE = 'SET_SELECTED_POINT_SIZE'
export const SET_SELECTED_BORDER_SIZE = 'SET_SELECTED_BORDER_SIZE'

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

export function setUnselectedPointSize(event) {
  return { type: SET_UNSELECTED_POINT_SIZE, size: parseFloat(event.target.value) }
}

export function setUnselectedBorderSize(event) {
  return { type: SET_UNSELECTED_BORDER_SIZE, size: parseFloat(event.target.value) }
}

export function setSelectedPointSize(event) {
  return { type: SET_SELECTED_POINT_SIZE, size: parseFloat(event.target.value) }
}

export function setSelectedBorderSize(event) {
  return { type: SET_SELECTED_BORDER_SIZE, size: parseFloat(event.target.value) }
}
