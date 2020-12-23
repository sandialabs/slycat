import $ from 'jquery';
import RemoteFileBrowser,{ RemoteFileBrowserProps, RemoteFileBrowserState } from "components/RemoteFileBrowser";
import React from 'react';
import renderer from 'react-test-renderer';
import { mount, ReactWrapper } from 'enzyme';
import sinon from 'sinon';
(global as any).$ = (global as any).jQuery = $;
// import client from "js/slycat-web-client";
import mockData from './remoteBrowserTestData.json';

describe("when we load the RemoteFileBrowser", () =>{
  let server = sinon.fakeServer.create();
  let component: renderer.ReactTestRenderer;
  let render:ReactWrapper;
  let callbackFileType:string;
  let callbackFilePath:string;
  let callbackParser:string;
  const onSelectFile =(path:string, type:string) =>{
    callbackFileType=type;
    callbackFilePath=path;
  }
  const onSelectParser =(type:string) =>{
    callbackParser=type;
  }
  beforeEach(() => {
  });

  xtest('we can mount without crashing', async () => {
    server.respondWith('POST', '/api/remotes/string/browse/', JSON.stringify(mockData));
    server.respond();
    render = await mount(
      <RemoteFileBrowser   
        hostname={"string"}
        persistenceId={"string"}
        onSelectFileCallBack={onSelectFile}
        onSelectParserCallBack={onSelectParser}
      />
        );
    let instance:any = render.instance() as any;
    server.respond();
    await instance.browse('/');
    render.state();
    expect(render).toBeTruthy();
    server.restore();
  });

  test('we can render the component', () => {
    component = renderer.create(
      <RemoteFileBrowser   
      hostname={"string"}
      persistenceId={"string"}
      onSelectFileCallBack={onSelectFile}
      onSelectParserCallBack={onSelectParser}
      />
    );
    expect(component).toBeTruthy();
  });

  test('we have expected props on initial load', async () => {
    render = await mount(
      <RemoteFileBrowser
        hostname={"string"}
        persistenceId={"string"}
        onSelectFileCallBack={onSelectFile}
        onSelectParserCallBack={onSelectParser}
      />
        );
    const props = render.props() as RemoteFileBrowserProps;
    expect(props).toMatchSnapshot();
  });

  test('we expect the correct state to populate', async () => {
    render = await mount(
      <RemoteFileBrowser
        hostname={"string"}
        persistenceId={"string"}
        onSelectFileCallBack={onSelectFile}
        onSelectParserCallBack={onSelectParser}
      />
        )
    const state = render.state() as RemoteFileBrowserState;
    expect(state).toMatchSnapshot();
  });

  test('we expect the component to render', () => {
    component = renderer.create(
      <RemoteFileBrowser   
      hostname={"string"}
      persistenceId={"string"}
      onSelectFileCallBack={onSelectFile}
      onSelectParserCallBack={onSelectParser}
      />
    );
    // this causes js heap fault
    // DefaultInstance = component.getInstance();
    expect(component).toMatchSnapshot();
  });
  
});
