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
          mds_coords: _.cloneDeep(action.mds_coords)
        }
      })

    default:
      return state

  }
}
