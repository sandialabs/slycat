
import React from 'react';
import $ from 'jquery';
// TODO the html loader breaks here
// import SearchWrapper, {SearchWrapperProps, SearchWrapperState} from "components/SearchWrapper";
import { mount } from "enzyme";
(global as any).$ = (global as any).jQuery = $;
xdescribe('when loading a slycat selector',() =>{

  const properties: SearchWrapperProps = {
    items:[{
      name:'test', 
      description:'test',
      created:'test',
      creator: 'test'
    }],
    type:'models'
  };
  const render = mount(
    <SearchWrapper
      {...properties}
    />
  );
  //TODO: fix jest to use html loader
  xtest('we have expected props on initial load', () => {
    const props = render.props() as SearchWrapperProps;
    expect(props).toMatchSnapshot();
  });

  xtest('we see no state', () => {
    const state = render.state() as SearchWrapperState;
    expect(state).toMatchSnapshot();
  });

  xtest('we should have a full initialization', () => {
    expect(render.instance()).toMatchSnapshot();
  });

  xtest('we should onChange function get value', () => {
    const myEventHandler = jest.fn();
    render.setProps({ onSelectCallBack: myEventHandler});
    render.find('select').simulate('change');
    expect(myEventHandler).toHaveBeenCalledWith('slycat-csv-parser');
  });
});

export default undefined