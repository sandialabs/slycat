
import React from 'react';
import Project, 
{ProjectProps, ProjectState} 
from "components/Project";
import { mount } from "enzyme";


describe('when loading a bad marking the UnrecognizedMarkingWarning',() =>{ 
  const props = {
    name: "test",
    id: "1234",
    description: "test",
    created: "1234",
    creator: "me"
  }
  const render = mount(
    <Project {...props} />
  );
  test('we have no props on initial load', () => {
    const props = render.props() as ProjectProps;
    expect(props).toMatchSnapshot();
  });

  test('we no state', () => {
    const state = render.state() as ProjectState;
    expect(state).toMatchSnapshot();
  });

  test('we should have a full initialization', () => {
    expect(render).toMatchSnapshot();
  });

});

export default undefined