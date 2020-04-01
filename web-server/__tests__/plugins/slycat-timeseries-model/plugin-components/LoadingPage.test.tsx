
import React from 'react';
import LoadingPage  from "slycat-timeseries-model/plugin-components/LoadingPage.tsx";
import {LoadingPageProps, LoadingPageState}  from "slycat-timeseries-model/plugin-components/types.ts";
import { mount, shallow } from "enzyme";


describe('Timeseries LoadingPage',() =>{ 
  const render = mount(
    <LoadingPage
    modelId={'modelID'}
    modelState={'waiting'}
    jid={'1234'}
    hostname={'hostname'}
    />
  );
  test('should be Defined', () => {
    expect(LoadingPage).toBeDefined();
  });
  test('we have expected props on initial load', () => {
    const props = render.props() as LoadingPageProps;
    expect(props).toMatchSnapshot();
  });
  test('we have expected state  on initial load', () => {
    const state = render.state() as LoadingPageState;
    expect(state).toMatchSnapshot();
  });
  test('we have expected props on initial load', () => {
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
