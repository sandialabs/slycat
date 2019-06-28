export const SET_COLORMAP = 'SET_COLORMAP';

export function setColormap(state_label, colormap, trigger, e) {
  return {
    type: SET_COLORMAP,
    name: colormap,
  }
}