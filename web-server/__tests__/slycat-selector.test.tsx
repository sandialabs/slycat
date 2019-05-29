
import React from 'react';
import SlycatSelector, {Option, SlycatSelectorProps, SlycatSelectorState} from "components/SlycatSelector";
import { mount } from "enzyme";

describe('when loading a slycat selector',() =>{

  const options: Option[] = [{
    text:'Comma separated values (CSV)',
    value:'slycat-csv-parser'
  },
  {
    text:'Dakota tabular',
    value:'slycat-dakota-parser'
  }]; 
  const properties: SlycatSelectorProps = {
    onSelectCallBack: jest.fn(),
    label:'Filetype',
    options
  };
  const render = mount(
    <SlycatSelector
      {...properties}
    />
  );
  test('we have expected props on initial load', () => {
    const props = render.props() as SlycatSelectorProps;
    expect(props).toMatchSnapshot();
  });

  test('we see no state', () => {
    const state = render.state() as SlycatSelectorState;
    expect(state).toMatchSnapshot();
  });

  test('we should have a full initialization', () => {
    expect(render.instance()).toMatchSnapshot();
  });

  test('we should onChange function get value', () => {
    const myEventHandler = jest.fn();
    render.setProps({ onSelectCallBack: myEventHandler});
    render.find('select').simulate('change');
    expect(myEventHandler).toHaveBeenCalledWith('slycat-csv-parser');
  });
});

export default undefined