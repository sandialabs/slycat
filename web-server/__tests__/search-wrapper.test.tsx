
import React from 'react';
import $ from 'jquery';
// TODO the html loader breaks here
import SearchWrapper, {SearchWrapperProps, SearchWrapperState} from "components/SearchWrapper";
import { mount } from "enzyme";
(global as any).$ = (global as any).jQuery = $;
describe('when loading a slycat selector',() =>{

  const properties: SearchWrapperProps = {
    items:[{
      name:'test1', 
      description:'test1',
      created:'test1',
      creator: 'test1'
    }],
    type:'models'
  };
  const render = mount(
    <SearchWrapper
      {...properties}
    />
  );
  //TODO: fix jest to use html loader
  test('we have expected props on initial load', () => {
    const props = render.props() as SearchWrapperProps;
    expect(props).toMatchSnapshot();
  });

  test('we see no state', () => {
    const state = render.state() as SearchWrapperState;
    expect(state).toMatchSnapshot();
  });

  test('we should have a full initialization', () => {
    expect(render).toMatchSnapshot();
  });

  test('we should onChange function get value', () => {
    jest.spyOn(render.instance(), 'filterList');
    jest.spyOn(render.instance(), 'matchStrings');
    render.find('input').simulate('change',{ target: { value: 'test' } });
    expect(render.instance().filterList).toHaveBeenCalledWith('test');
    expect(render.instance().matchStrings).toHaveBeenCalledWith('test1','test');
  });

  test('we should have null input if there is no list', () => {
    const emptyProperties: SearchWrapperProps = {
      items:[],
      type:'models'
    };
    const emptyRender = mount(
      <SearchWrapper
        {...emptyProperties}
      />
    );
    expect(emptyRender).toMatchSnapshot();
  });

});

export default undefined