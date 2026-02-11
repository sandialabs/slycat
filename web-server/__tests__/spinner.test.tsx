
import React from 'react';
import Spinner from "components/Spinner";
import { mount } from "enzyme";


describe('when loading a bad marking the UnrecognizedMarkingWarning',() =>{ 
  const render = mount(
    <Spinner/>
  );
  test('renders without props and state', () => {
    expect(render).toMatchSnapshot();
  });

  test('we should have a full initialization', () => {
    expect(render).toMatchSnapshot();
  });

});

export default undefined