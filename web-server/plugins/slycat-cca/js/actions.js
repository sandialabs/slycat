/* eslint-disable no-else-return */
import * as chunker from "js/chunker";
import api_root from "js/slycat-api-root";

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
export const REQUEST_VARIABLE = 'REQUEST_VARIABLE';
export const RECEIVE_VARIABLE = 'RECEIVE_VARIABLE';

export function setVariableSelected(variable, state_label, trigger, e) {
  return function(dispatch, getState) {
    dispatch(selectVariable(variable));
    dispatch(fetchVariableValuesIfNeeded(variable));
  }
}

function selectVariable(variable) {
  return { 
    type: SET_VARIABLE_SELECTED, 
    id: variable,
  }
}

function requestVariable(variable) {
  return {
    type: REQUEST_VARIABLE,
    variable
  }
}

function receiveVariable(variable, result) {
  return {
    type: RECEIVE_VARIABLE,
    variable,
    values: result,
  }
}

// Thunk action creator. Use like so:
// store.dispatch(fetchVariableValues(0))
function fetchVariableValues(variable) {
  // Thunk middleware knows how to handle functions.
  // It passes the dispatch method as an argument to the function,
  // thus making it able to dispatch actions itself.

  return function(dispatch, getState) {
    // First dispatch: the app state is updated to inform
    // that the API call is starting.

    dispatch(requestVariable(variable))

    // The function called by the thunk middleware can return a value,
    // that is passed on as the return value of the dispatch method.

    // In this case, we return a promise to wait for.
    // This is not required by thunk middleware, but it is convenient for us.

    // return fetch(`https://www.reddit.com/r/${subreddit}.json`)
    //   .then(
    //     response => response.json(),
    //     // Do not use catch, because that will also catch
    //     // any errors in the dispatch and resulting render,
    //     // causing a loop of 'Unexpected batch number' errors.
    //     // https://github.com/facebook/react/issues/6895
    //     error => console.log('An error occurred.', error)
    //   )
    //   .then(json =>
    //     // We can dispatch many times!
    //     // Here, we update the app state with the results of the API call.

    //     dispatch(receivePosts(subreddit, json))
    //   )

    // If the selected variable is the index, we need to generate the values since
    // they are not saved in the model.
    if(variable == getState().derived.table_metadata["column-count"] - 1)
    {
      let count = getState().derived.table_metadata["row-count"];
      let v = new Float64Array(count);
      for(var i = 0; i != count; ++i)
        v[i] = i;
        dispatch(receiveVariable(variable, v))
    }
    // Otherwise get them through the API
    else
    {
      chunker.get_model_array_attribute({
        api_root : api_root,
        mid : getState().derived.model_id,
        aid : "data-table",
        array : 0,
        attribute : variable,
        success : function(result)
        {
          dispatch(receiveVariable(variable, result))
        },
        // error : artifact_missing
      });
    }
  }
}

function shouldFetchVariableValues(state, variable) {
  const column_data = state.derived.column_data[variable];
  // No entry for that column means go
  if (!column_data) {
    return true
  } 
  // If we are fetching that column, no go
  else if (column_data.isFetching) {
    return false
  }
  // Have an entry for column but not fetching it, so go
  else {
    return true;
  }
}

export function fetchVariableValuesIfNeeded(variable) {
  // Note that the function also receives getState()
  // which lets you choose what to dispatch next.

  // This is useful for avoiding a network request if
  // a cached value is already available.

  return (dispatch, getState) => {
    if (shouldFetchVariableValues(getState(), variable)) {
      // Dispatch a thunk from thunk!
      return dispatch(fetchVariableValues(variable))
    } else {
      // Let the calling code know there's nothing to wait for.
      return Promise.resolve()
    }
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
