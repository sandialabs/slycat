/*
 * action types
 */

export const SET_VARIABLE_SELECTED = 'SET_VARIABLE_SELECTED';
export const SET_VARIABLE_SORTED = 'SET_VARIABLE_SORTED';
// export const TOGGLE_VARIABLE_SORT_DIRECTION = 'TOGGLE_VARIABLE_SORT_DIRECTION';
export const SET_CCA_COMPONENT_SELECTED = 'SET_CCA_COMPONENT_SELECTED';
export const SET_CCA_COMPONENT_SORTED = 'SET_CCA_COMPONENT_SORTED';
export const SET_SIMULATIONS_SELECTED = 'SET_SIMULATIONS_SELECTED';
export const ADD_SIMULATIONS_SELECTED = 'ADD_SIMULATIONS_SELECTED';
export const REMOVE_SIMULATIONS_SELECTED = 'REMOVE_SIMULATIONS_SELECTED';
export const TOGGLE_SIMULATIONS_SELECTED = 'TOGGLE_SIMULATIONS_SELECTED';
export const SET_COLORMAP = 'SET_COLORMAP';

export function setVariableSelected(variable) {
  return { 
  	type: SET_VARIABLE_SELECTED, 
  	id: variable,
  }
}
export function setVariableSorted(variable) {
  return { 
  	type: SET_VARIABLE_SORTED, 
  	id: variable,
  }
}

export function setCCAComponentSelected(component) {
  return { 
  	type: SET_CCA_COMPONENT_SELECTED, 
  	id: component,
  }
}
export function setCCAComponentSorted(component) {
  return { 
  	type: SET_CCA_COMPONENT_SORTED, 
  	id: component,
  }
}

export function setSimulationsSelected(simulations) {
  return { 
  	type: SET_SIMULATIONS_SELECTED, 
  	simulations: simulations,
  }
}

export function addSimulationsSelected(simulations) {
  return { 
  	type: ADD_SIMULATIONS_SELECTED, 
  	simulations: simulations,
  }
}

export function removeSimulationsSelected(simulations) {
  return { 
  	type: REMOVE_SIMULATIONS_SELECTED, 
  	simulations: simulations,
  }
}

export function toggleSimulationsSelected(simulations) {
  return { 
  	type: TOGGLE_SIMULATIONS_SELECTED, 
  	simulations: simulations,
  }
}

// Probably not needed since we can just dispatch SET_VARIABLE_SORTED and toggle the 
// sort direction if the currently sorted variable is the same as the new one
// export function toggleVariableSortDirection(variable) {
//   return { 
//   	type: TOGGLE_VARIABLE_SORT_DIRECTION, 
//   	id: variable,
//   }
// }

export function setColormap(colormap) {
  return {
    type: SET_COLORMAP,
    name: colormap,
  }
}

// export function changeFontFamily(family) {
//   return { type: CHANGE_FONT_FAMILY, fontFamily: family }
// }

// export function changeAxesVariableScale(variable, scale) {
//   return { type: CHANGE_AXES_VARIABLE_SCALE, axesVariable: variable, axesScale: scale }
// }
