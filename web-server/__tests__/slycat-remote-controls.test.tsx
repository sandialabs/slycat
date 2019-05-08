import SlycatRemoteControls from "../components/SlycatRemoteControls";
import React from 'react';
import renderer from 'react-test-renderer';
import { shallow } from 'enzyme';

describe("when we load the SlycatRemoteControls", () =>{

  let component: renderer.ReactTestRenderer;
  let DefaultInstance: any;
  beforeEach(async () => {
    console.log("begin");
    global.fetch.mockReset();
    global.fetch.mockResponses(
      [
        JSON.stringify([{ status: false }]),
        { status: 200 }
      ],
      [
        JSON.stringify([{ name: 'bleach', average_score: 68 }]),
        { status: 200 }
      ],
      [
        JSON.stringify([{ status: false }]),
        { status: 200 }
      ],
      [
        JSON.stringify([{ status: false }]),
        { status: 200 }
      ]
    )
    component = await renderer.create(
      <SlycatRemoteControls callBack={()=>{}}/>
    );
    DefaultInstance = component.getInstance();
  });

  test('we can render without crashing', async () => {
    expect(await shallow(<SlycatRemoteControls callBack={()=>{}}/>)).toBeTruthy();
  });

  test('we can render the component', () => {
    expect(component).toBeTruthy();
  });

  xtest('we have expected state on initial load', () => {
    
    expect(DefaultInstance.props.userName).toBe("test");
  });

  xtest('we expect the correct props to populate', () => {
    expect(DefaultInstance.state.path).toBe("/");
  });

  test('we expect the correct props to populate', () => {
    expect(DefaultInstance.render()).toMatchSnapshot();
  });
  
});
