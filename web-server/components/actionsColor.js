export const SET_COLORMAP = 'SET_COLORMAP';

export function setColormap(colormap) {
  return {
    type: SET_COLORMAP,
    name: colormap,
  }
}