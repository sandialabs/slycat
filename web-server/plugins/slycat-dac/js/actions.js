export const SET_MDS_COORDS = 'SET_MDS_COORDS'

export function setMDSCoords(mds_coords) {
  return { 
    type: SET_MDS_COORDS, 
    mds_coords
  }
}
