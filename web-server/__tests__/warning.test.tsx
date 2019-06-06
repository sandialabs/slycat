
import React from 'react';
import Warning, {WarningProps, WarningState} from "components/Warning";
import { mount } from "enzyme";

describe('when loading a warning message',() =>{
  const message = ['test1','test2','test3'];
  const properties: WarningProps = {
    warningMessage:message,
  };
  const render = mount(
    <Warning
      {...properties}
    />
      );
  test('we have expected props on initial load', () => {
    const props = render.props() as WarningProps;
    expect(props).toMatchSnapshot();
  });
  test('we have expected null state  on initial load', () => {
    const props = render.state() as WarningState;
    expect(props).toMatchSnapshot();
  });
  test('we should have a full initialization', () => {
     expect(render).toMatchSnapshot();
  });
  test('we should be able to change the background color', () => {
    render.setProps({ backgroundColor: 'colorfulness'});
    expect(render).toMatchSnapshot();
  });
});

export default undefined