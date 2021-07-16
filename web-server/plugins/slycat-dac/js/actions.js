export const SET_MDS_COORDS = 'SET_MDS_COORDS'
export const SET_ZOOM_EXTENT = 'SET_ZOOM_EXTENT'
export const SET_ZOOM_FLAG = 'SET_ZOOM_FLAG'

export function setMDSCoords(mds_coords) {
  return { 
    type: SET_MDS_COORDS, 
    mds_coords
  }
}

export function setZoomExtent(extent) {
  return { 
    type: SET_ZOOM_EXTENT, 
    extent
  }
}

export function setZoomFlag(flag) {
  return { 
    type: SET_ZOOM_FLAG, 
    flag
  }
}