
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
  test('is defined', () => {
    expect(SearchWrapper).toBeDefined();
  });
  xtest('we have expected props on initial load', () => {
    const render = mount(
      <SearchWrapper
        {...properties}
      />
    );
    const props = render.props() as SearchWrapperProps;
    expect(props).toMatchSnapshot();
  });

  xtest('we see no state', () => {
    const render = mount(
      <SearchWrapper
        {...properties}
      />
    );
    const state = render.state() as SearchWrapperState;
    expect(state).toMatchSnapshot();
  });

  xtest('we should have a full initialization', () => {
    const render = mount(
      <SearchWrapper
        {...properties}
      />
    );
    expect(render).toMatchSnapshot();
  });

  xtest('we should call filter and match on search', () => {
    const render = mount(
      <SearchWrapper
        {...properties}
      />
    );
    jest.spyOn(render.instance(), 'filterList');
    jest.spyOn(render.instance(), 'matchStrings');
    render.find('input').simulate('change',{ target: { value: 'test' } });
    expect(render.instance().filterList).toHaveBeenCalledWith('test');
    expect(render.instance().matchStrings).toHaveBeenCalledWith('test1','test');
  });

  xtest('we should see a message displayed for a bad search', () => {
    const render = mount(
      <SearchWrapper
        {...properties}
      />
    );
    render.find('input').simulate('change',{ target: { value: 'no match' } });
    expect(render).toMatchSnapshot();
  });

  xtest('we should have empty item  message if there is no model list', () => {
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

  xtest('we should have empty item  message if there is no project list', () => {
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