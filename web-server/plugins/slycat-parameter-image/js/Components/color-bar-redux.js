import React from 'react'
import ControlsDropdown from './controls-dropdown-redux.js';

let ColorButton = ({ store, element, dropdown, selection, whatsUp, stateObject, saySomething }) => (
            <ControlsDropdown key={dropdown[0].id} id={dropdown[0].id} label={dropdown[0].label} title={dropdown[0].title}
                                  state_label={dropdown[0].state_label} trigger={dropdown[0].trigger}
                                  items={dropdown[0].items}
                                  selected={selection} single={dropdown[0].single} set_selected={dropdown[0].selected} store={store}/>
)

export default ColorButton;