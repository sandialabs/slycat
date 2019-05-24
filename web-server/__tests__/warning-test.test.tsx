
import React from 'react';
import Warning, {WarningProps} from "components/Warning";
import { mount } from "enzyme";

describe('when loading a warning message',() =>{
  test('we have expected props on initial load', async () => {
    const message = ['test1','test2','test3'];
    const properties: WarningProps = {
      warningMessage:message,
    };
    const render = await mount(
      <Warning
        {...properties}
      />
        );
    const props = render.props() as WarningProps;
    expect(props).toMatchSnapshot();
  });

  test('we should have a full initialization', async () => {
    const message = ['test1','test2','test3'];
    const properties: WarningProps = {
      warningMessage:message,
    };
    const render = await mount(
      <Warning
        {...properties}
      />
        );
     expect(render.instance()).toMatchSnapshot();
  });
});

export default undefined