
import React from 'react';
import {
  JobCodes
} from "components/loading-page/JobCodes";
import { mount } from "enzyme";


describe('Timeseries Jobcodes',() =>{ 
  const render = mount(
    <JobCodes/>
  );
  test('should match snapshot', () => {
    expect(render).toMatchSnapshot();
  });

});
