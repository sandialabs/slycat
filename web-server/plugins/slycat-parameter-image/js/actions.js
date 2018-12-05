/*
 * action types
 */

export const CHANGE_FONT_SIZE = 'CHANGE_FONT_SIZE'
export const CHANGE_FONT_FAMILY = 'CHANGE_FONT_FAMILY'
export const CHANGE_AXES_VARIABLE_SCALE = 'CHANGE_AXES_VARIABLE_SCALE'

export function changeFontSize(size) {
  return { type: CHANGE_FONT_SIZE, fontSize: size }
}

export function changeFontFamily(family) {
  return { type: CHANGE_FONT_FAMILY, fontFamily: family }
}

export function changeAxesVariableScale(variable, scale) {
  return { type: CHANGE_AXES_VARIABLE_SCALE, axesVariable: variable, axesScale: scale }
}
