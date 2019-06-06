/*
 * action types
 */

export const CHANGE_VARIABLE_SELECTION = 'CHANGE_VARIABLE_SELECTION'

export function changeVariableSelection(variable) {
  return { 
  	type: CHANGE_VARIABLE_SELECTION, 
  	variableSelection: variable 
  }
}

// export function changeFontFamily(family) {
//   return { type: CHANGE_FONT_FAMILY, fontFamily: family }
// }

// export function changeAxesVariableScale(variable, scale) {
//   return { type: CHANGE_AXES_VARIABLE_SCALE, axesVariable: variable, axesScale: scale }
// }
