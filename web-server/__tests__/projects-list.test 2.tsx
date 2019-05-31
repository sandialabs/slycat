
import React from 'react';
import ProjectsList, 
{ProjectsListProps, ProjectsListState,ProjectData} 
from "components/ProjectsList";
import { mount } from "enzyme";


describe('when loading a bad marking the UnrecognizedMarkingWarning',() =>{ 
  const project1: ProjectData = {
    name: "test",
    _id: "1234",
    description: "test",
    created: "1234",
    creator: "me"
  }
  const project2: ProjectData = {
    name: "test",
    _id: "12345",
    description: "test",
    created: "12345",
    creator: "me"
  }
  const render = mount(
    <ProjectsList 
    projects={[project1,project2]} 
    />
  );
  test('we have no props on initial load', () => {
    const props = render.props() as ProjectsListProps;
    expect(props).toMatchSnapshot();
  });

  test('we no state', () => {
    const state = render.state() as ProjectsListState;
    expect(state).toMatchSnapshot();
  });

  test('we should have a full initialization', () => {
    expect(render).toMatchSnapshot();
  });

});

export default undefined