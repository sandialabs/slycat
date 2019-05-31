
import React from 'react';
import Spinner, 
{SpinnerProps, SpinnerState} 
from "components/Spinner";
import { mount } from "enzyme";


describe('when loading a bad marking the UnrecognizedMarkingWarning',() =>{ 
  const render = mount(
    <Spinner/>
  );
  test('we have no props on initial load', () => {
    const props = render.props() as SpinnerProps;
    expect(props).toMatchSnapshot();
  });

  test('we no state', () => {
    const state = render.state() as SpinnerState;
    expect(state).toMatchSnapshot();
  });

  test('we should have a full initialization', () => {
    expect(render).toMatchSnapshot();
  });

});

export default undefined