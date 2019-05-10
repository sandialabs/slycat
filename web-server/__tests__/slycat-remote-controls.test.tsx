import SlycatRemoteControls from "../components/SlycatRemoteControls";
import React from 'react';
import renderer from 'react-test-renderer';
import { shallow, mount } from 'enzyme';

interface GlobalAny extends NodeJS.Global {
  fetch: any
}

const globalAny:GlobalAny = global;

describe("when we load the SlycatRemoteControls", () =>{

  let component: renderer.ReactTestRenderer;
  let DefaultInstance: any;
  beforeEach(() => {
  });

  xtest('we can render without crashing', async () => {
    globalAny.fetch.mockResponses(
      [
        JSON.stringify({ status: false }),
        { status: 200 }
      ],
      [
        JSON.stringify({ status: false }),
        { status: 200 }
      ],
      [
        JSON.stringify(["test"]),
        { status: 200 }
      ],
    )
    const shallowComponent:any = shallow(<SlycatRemoteControls callBack={()=>{}}/>);
    await shallowComponent.instance().componentDidMount();
    await shallowComponent.update();
    expect(shallowComponent.instance()).toMatchSnapshot();
  });

  xtest('we can render the component', () => {
    component = renderer.create(
      <SlycatRemoteControls callBack={()=>{}}/>
    );
    DefaultInstance = component.getInstance();
    expect(component).toBeTruthy();
  });

  xtest('we have expected state on initial load', () => {
    
    expect(DefaultInstance.props.userName).toBe("test");
  });

  xtest('we expect the correct state to populate', () => {
    expect(DefaultInstance.state.path).toBe("/");
  });

  xtest('we expect the correct props to populate', () => {
    expect(DefaultInstance.render()).toMatchSnapshot();
  });
  
});
