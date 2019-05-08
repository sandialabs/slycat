import RemoteFileBrowser from "../components/RemoteFileBrowser";
import React from 'react';
import renderer from 'react-test-renderer';
import { shallow } from 'enzyme';

describe("when we load the RemoteFileBrowser", () =>{

  let component: renderer.ReactTestRenderer;
  let DefaultInstance: any;
  beforeEach(() => {
    component = renderer.create(
      <RemoteFileBrowser userName={"test"}/>
    );
    DefaultInstance = component.getInstance();
  });

  test('we can render without crashing', () => {
    expect(shallow(<RemoteFileBrowser userName={"test"}/>)).toBeTruthy();
  });

  test('we can render the component', () => {
    expect(component).toBeTruthy();
  });

  test('we have expected state on initial load', () => {
    
    expect(DefaultInstance.props.userName).toBe("test");
  });

  test('we expect the correct props to populate', () => {
    expect(DefaultInstance.state.path).toBe("/");
  });

  test('we expect the correct props to populate', () => {
    expect(DefaultInstance.render()).toMatchSnapshot();
  });
  
});
