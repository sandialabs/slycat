
import React from 'react';
import { mount } from "enzyme";
import ConnectButton, {ConnectButtonProps, ConnectButtonState} from 'components/ConnectButton';
interface GlobalAny extends NodeJS.Global {
  fetch: any
}
const globalAny:GlobalAny = global;
describe('when loading a nav bar',() =>{ 
  test('we have expected props on initial load', async () => {
    const properties: ConnectButtonProps = {
      text: 'buttonText',
      callBack: jest.fn(),
      sessionExists:false,
      loadingData:false,
      hostname:'testHost',
      username:'user',
      password:'password123'
    };
    const render = await mount(
      <ConnectButton
        {...properties}
      />
        );
    const props = render.props() as ConnectButtonProps;
    expect(props).toMatchSnapshot();
  });

  test('we have proper state', async () => {
    const properties: ConnectButtonProps = {
      text: 'buttonText',
      callBack: jest.fn(),
      sessionExists:false,
      loadingData:false,
      hostname:'testHost',
      username:'user',
      password:'password123'
    };
    const render = await mount(
      <ConnectButton
        {...properties}
      />
        );
    const state = render.state() as ConnectButtonState;
    expect(state).toMatchSnapshot();
  });

  test('we should have a full initialization', async () => {
    const properties: ConnectButtonProps = {
      text: 'buttonText',
      callBack: jest.fn(),
      sessionExists:false,
      loadingData:false,
      hostname:'testHost',
      username:'user',
      password:'password123'
    };
    const render = await mount(
      <ConnectButton
        {...properties}
      />
        );
    expect(render.instance()).toMatchSnapshot();
  });

  test('we be able to check hostname status', async () => {
    const properties: ConnectButtonProps = {
      text: 'buttonText',
      callBack: jest.fn(),
      sessionExists:false,
      loadingData:false,
      hostname:'testHost',
      username:'user',
      password:'password123'
    };
    globalAny.fetch.mockResponseOnce(JSON.stringify({ status: true }));
    const render = await mount(
      <ConnectButton
        {...properties}
      />
    );
    //make our webservice call
    await (render.instance() as any).checkRemoteStatus();
    const newState =render.state() as ConnectButtonState;
    expect(newState.sessionExists).toBe(true);
  });

  test('we be able to call connect', async () => {
    const properties: ConnectButtonProps = {
      text: 'buttonText',
      callBack: jest.fn(),
      sessionExists:false,
      loadingData:false,
      hostname:'testHost',
      username:'user',
      password:'password123'
    };
    globalAny.fetch.mockResponse(JSON.stringify({ status: true }));
    const render = await mount(
      <ConnectButton
        {...properties}
      />
    );
    //make our webservice call
    const instance:any = render.instance() as any;
    jest.spyOn(instance, 'connect');
    await instance.connect();
    expect(instance.connect).toHaveBeenCalled();
  });
});

export default undefined