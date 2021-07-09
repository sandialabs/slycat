import {
  SET_MDS_COORDS
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

    default:
      return state

  }
}
