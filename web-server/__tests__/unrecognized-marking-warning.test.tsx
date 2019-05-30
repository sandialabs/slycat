
import React from 'react';
import UnrecognizedMarkingWarning, 
{UnrecognizedMarkingWarningProps, UnrecognizedMarkingWarningState} 
from "components/UnrecognizedMarkingWarning";
import { mount } from "enzyme";


describe('when loading a bad marking the UnrecognizedMarkingWarning',() =>{ 
  const marking="empty";
  const warning_element= {setAttribute:jest.fn()};
  const render = mount(
    <UnrecognizedMarkingWarning
      marking = {marking}
      warning_element = {warning_element}
      project_id = "1234"
    />
  );
  test('we have expected props on initial load', () => {
    const props = render.props() as UnrecognizedMarkingWarningProps;
    expect(props).toMatchSnapshot();
  });

  test('we no state', () => {
    const state = render.state() as UnrecognizedMarkingWarningState;
    expect(state).toMatchSnapshot();
  });

  test('we should have a full initialization', () => {
    expect(render).toMatchSnapshot();
  });

  test('we should have a show modal function that calls setAttribute', () => {
    render.instance().showModel();
    expect(warning_element.setAttribute).toHaveBeenCalled();
  });

});

export default undefined