const reducer = (state = {}, action) => {
  switch (action.type) {
      case 'SWITCH_COLOR':
        return { state, say : 'Change the color' };
        //return { state };
      default:
        return state;
  }
};
export default reducer;