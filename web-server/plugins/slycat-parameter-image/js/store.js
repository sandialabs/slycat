import { createStore } from 'redux';
import slycat from './reducers';

export const store = createStore(slycat);
// This is how to pass the initial state from the server, or in our case, the bookmark
// export const store = createStore(todoApp, window.STATE_FROM_SERVER)