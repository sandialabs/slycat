
import React from 'react';
import $ from 'jquery';
// TODO the html loader breaks here
import SearchWrapper, {SearchWrapperProps, SearchWrapperState} from "components/SearchWrapper";
import { mount } from "enzyme";
(global as any).$ = (global as any).jQuery = $;
describe('when using the slycat search wrapper',() =>{

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

  test('we should call filter and match on search', () => {
    jest.spyOn(render.instance(), 'filterList');
    jest.spyOn(render.instance(), 'matchStrings');
    render.find('input').simulate('change',{ target: { value: 'test' } });
    expect(render.instance().filterList).toHaveBeenCalledWith('test');
    expect(render.instance().matchStrings).toHaveBeenCalledWith('test1','test');
  });

  test('we should see a message displayed for a bad search', () => {
    render.find('input').simulate('change',{ target: { value: 'no match' } });
    expect(render).toMatchSnapshot();
  });

  test('we should have empty item  message if there is no model list', () => {
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

  test('we should have empty item  message if there is no project list', () => {
    const emptyProperties: SearchWrapperProps = {
      items:[],
      type:'projects'
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