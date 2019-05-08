import SlycatRemoteControls from "../components/SlycatRemoteControls";
import React from 'react';
import renderer from 'react-test-renderer';
import { shallow } from 'enzyme';

describe("when we load the SlycatRemoteControls", () =>{

  let component: renderer.ReactTestRenderer;
  let DefaultInstance: any;
  beforeEach(async () => {
    global.fetch.mockReset();
    global.fetch.mockResponse(JSON.stringify({ data: '12345' }))
    component = await renderer.create(
      <SlycatRemoteControls callBack={()=>{}}/>
    );
    DefaultInstance = component.getInstance();
  });

  test('we can render without crashing', async () => {
    expect(await shallow(<SlycatRemoteControls userName={"test"}/>)).toBeTruthy();
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
