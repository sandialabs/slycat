import {
  SET_MDS_COORDS,
  SET_ZOOM_EXTENT,
  SET_ZOOM_FLAG,
  SET_SCATTERPLOT_SIZE,
} from './actions';

import _ from 'lodash';


const initialState = {
}

export default function dac_reducer(state = initialState, action) {
  switch (action.type) {

    case SET_MDS_COORDS:
      return Object.assign({}, state, {
        derived: {
          ...state.derived,
          // deep cloning mds_coords because it's an array of arrays
          // and we don't want changes to it reflected in any components, or vice versa
          mds_coords: _.cloneDeep(action.mds_coords)
        }
      })
    case SET_ZOOM_EXTENT:
      return Object.assign({}, state, {
        // deep cloning extent because it's an array of arrays
        // and we don't want changes to it reflected in any components, or vice versa
        dac_zoom_extent: _.cloneDeep(action.extent)
      })
    case SET_ZOOM_FLAG:
      return Object.assign({}, state, {
        // deep cloning extent because it's an array of arrays
        // and we don't want changes to it reflected in any components, or vice versa
        dac_zoom_flag: _.cloneDeep(action.flag)
      })
    case SET_SCATTERPLOT_SIZE:
      return Object.assign({}, state, {
        // deep cloning extent because it's an array of arrays
        // and we don't want changes to it reflected in any components, or vice versa
        scatterplot_size: _.cloneDeep(action.size)
      })

    default:
      return state

  }
}
