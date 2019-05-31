
import React from 'react';
import ProgressBar, {ProgressBarProps, ProgressBarState} from "components/ProgressBar";
import { mount } from "enzyme";


describe('when loading a nav bar',() =>{ 
  const properties: ProgressBarProps = {
    progress:10,
    hidden:false
  };
  const render = mount(
    <ProgressBar
      {...properties}
    />
  );
  test('we have expected props on initial load', () => {
    const props = render.props() as ProgressBarProps;
    expect(props).toMatchSnapshot();
  });

  test('we no state', () => {
    const state = render.state() as ProgressBarState;
    expect(state).toMatchSnapshot();
  });

  test('we should have a full initialization', () => {
    expect(render.instance()).toMatchSnapshot();
  });

  test('should render null if hidden', () => {
    render.setProps({hidden:true});
    render.update();
    expect(render.instance().render()).toEqual(null);
  });
});

export default undefined