
import React from 'react';
import LoadingPage  from "slycat-timeseries-model/plugin-components/LoadingPage.tsx";
import {LoadingPageProps, LoadingPageState}  from "slycat-timeseries-model/plugin-components/types.ts";
import { mount, shallow } from "enzyme";

describe('Timeseries LoadingPage',() =>{ 
  test('should be Defined', () => {
    expect(LoadingPage).toBeDefined();
  });
  //TODO: fix these tests, there is an error with with how jest now handles ajax calls
  xtest('we have expected props on initial load', () => {
    const render = mount(
      <LoadingPage
      modelId={'modelID'}
      modelState={'waiting'}
      jid={'1234'}
      hostname={'hostname'}
      />
    );
    const props = render.props() as LoadingPageProps;
    expect(props).toMatchSnapshot();
  });
  xtest('we have expected state  on initial load', () => {
    const render = mount(
      <LoadingPage
      modelId={'modelID'}
      modelState={'waiting'}
      jid={'1234'}
      hostname={'hostname'}
      />
    );
    const state = render.state() as LoadingPageState;
    expect(state).toMatchSnapshot();
  });
  xtest('we have expected props on initial load', () => {
    const myDate = new Date('2019-05-14T11:01:58/135Z');
    global.Date = jest.fn(() => myDate);
    const test = shallow(
      <LoadingPage
      modelId={'modelID'}
      modelState={'waiting'}
      jid={'1234'}
      hostname={'hostname'}
      />
    );
    expect(test).toMatchSnapshot();
  });
});
