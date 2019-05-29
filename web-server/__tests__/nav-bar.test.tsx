
import React from 'react';
import NavBar, {NavBarProps, NavBarState} from "components/NavBar";
import { mount } from "enzyme";


describe('when loading a nav bar',() =>{ 
  const names = ['test1','test2','test3'];
  const properties: NavBarProps = {
    navNames:names,
    selectedNameIndex:1
  };
  const render = mount(
    <NavBar
      {...properties}
    />
  );
  test('we have expected props on initial load', () => {
    const props = render.props() as NavBarProps;
    expect(props).toMatchSnapshot();
  });

  test('we no state', () => {
    const state = render.state() as NavBarState;
    expect(state).toMatchSnapshot();
  });

  test('we should have a full initialization', () => {
    expect(render.instance()).toMatchSnapshot();
  });
});

export default undefined