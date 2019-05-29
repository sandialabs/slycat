import React from 'react';
import SlycatFormRadioCheckbox, {SlycatFormRadioCheckboxProps, SlycatFormRadioCheckboxState} from "components/SlycatFormRadioCheckbox";
import { mount } from "enzyme";

describe('when loading a slycat selector',() =>{

  const properties: SlycatFormRadioCheckboxProps = {
    checked:true,
    onChange:jest.fn(),
    value:'local',
    text:'Local',
    style:{marginRight: '92%'}
  };
  const render = mount(
    <SlycatFormRadioCheckbox
      {...properties}
    />
  );
  test('we have expected props on initial load', () => {
    const props = render.props() as SlycatFormRadioCheckboxProps;
    expect(props).toMatchSnapshot();
  });

  test('we see no state', () => {
    const state = render.state() as SlycatFormRadioCheckboxState;
    expect(state).toMatchSnapshot();
  });

  test('we should have a full initialization', () => {
    expect(render.instance()).toMatchSnapshot();
  });

  test('we should onChange function get value', () => {
    const myEventHandler = jest.fn();
    render.setProps({ onChange: myEventHandler});
    render.find('input').simulate('change','local');
    expect(myEventHandler).toHaveBeenCalledWith('local');
  });
});

export default undefined