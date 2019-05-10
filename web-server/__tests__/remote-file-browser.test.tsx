import RemoteFileBrowser from "../components/RemoteFileBrowser";
import React from 'react';
import renderer from 'react-test-renderer';
import { shallow } from 'enzyme';
import data from './remoteBrowserTestData.json';

describe("when we load the RemoteFileBrowser", () =>{

  let component: renderer.ReactTestRenderer;
  let DefaultInstance: any;
  let callbackFileType:string;
  let callbackFilePath:string;

  beforeEach(() => {
    jest.mock('../js/slycat-web-client', () => ({
      async onGetBookingList() {
          return data;
      }
    }));
    component = renderer.create(
      <RemoteFileBrowser   
      hostname={"string"}
      persistenceId={"string"}
      onSelectFileCallBack={(path:string, type:string)=>{
        callbackFileType=type;
        callbackFilePath=path;
      }}
      />
    );
    DefaultInstance = component.getInstance();
  });

  test('we can render without crashing', () => {
    expect(shallow(
    <RemoteFileBrowser   
      hostname={"string"}
      persistenceId={"string"}
      onSelectFileCallBack={(path:string, type:string)=>{
        callbackFileType=type;
        callbackFilePath=path;
      }}
    />
      )).toBeTruthy();
  });

  test('we can render the component', () => {
    expect(component).toBeTruthy();
  });

  test('we have expected props on initial load', () => {
    
    expect(DefaultInstance.props.hostname).toBe("string");
  });

  test('we expect the correct state to populate', () => {
    console.log(data)
    expect(DefaultInstance.state.path).toBe("/");
  });

  test('we expect the correct props to populate', () => {
    expect(DefaultInstance.render()).toMatchSnapshot();
  });
  
});
