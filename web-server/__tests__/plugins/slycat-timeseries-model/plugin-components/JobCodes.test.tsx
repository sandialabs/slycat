
import React from 'react';
import {
  JobCodes
} from "slycat-timeseries-model/plugin-components/JobCodes.tsx";
import { mount } from "enzyme";


describe('Timeseries Jobcodes',() =>{ 
  const render = mount(
    <JobCodes/>
  );
  test('should match snapshot', () => {
    expect(render).toMatchSnapshot();
  });

});
