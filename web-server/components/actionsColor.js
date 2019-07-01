export const SET_COLORMAP = 'SET_COLORMAP';

export function setColormap(colormap, state_label, trigger, e) {
  return {
    type: SET_COLORMAP,
    name: colormap,
  }
}