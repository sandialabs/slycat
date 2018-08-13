const reducer = (state = {}, action) => {
  switch (action.type) {
      case 'HELLO_REACT':
        return {...state, say : 'Hello World Redux' };
      default:
        return state;
  }
};
export default reducer;