import React, { useState } from "react";

export default function SlycatTableIngestion(props) {

  // Declare a new UI state variables...
  // To track which variables are selected
  // selected is an array, each element corresponds to a variable, with boolean values indicating whether it's selected.
  const [selected, setSelected] = useState(props.variables.map((variable, indexVars) => variable.selected));
  // To track the last selected variable
  const [lastSelected, setLastSelected] = useState(0);

  function anyVariablesSelected() {
    for(var i = 0; i < selected.length; i++)
    {
      if( selected[i] )
      {
        return true;
      }
    }
    return false;
  }

  function checkAll(e) {
    console.log("checkAll");
  }

  function selectAll(e) {
    let property = e.target.dataset.property;
    for(let [index, variableSelected] of selected.entries())
    {
      if(variableSelected)
      {
        // Find the radio button that needs to be selected based on its name and value attributes
        let radio = document.querySelector(`.${props.uniqueID} input[value='${property}'][name='${index}']`);
        // Fire the onChange handler only if radio button is not disabled
        if(!radio.disabled)
        {
          props.onChange({currentTarget: radio});
        }
      }
    }
  }

  function select(event, varIndex) {
    if(props.variables[varIndex].disabled)
    {
      return;
    }
    else if(event.shiftKey)
    {
      // Find start and end between lastSelected and currently shift clicked
      let begin = Math.min(lastSelected, varIndex);
      let end = Math.max(lastSelected, varIndex);

      // Set everything in between to selected
      let newSelected = selected.slice(0);
      for(var i = begin; i <= end; i++)
      {
        if(!props.variables[i].disabled)
        {
          newSelected[i] = true;
        }
      }
      setSelected(newSelected);
      // Set current clicked to lastSelected
      setLastSelected(varIndex);
    }
    else if(event.ctrlKey || event.metaKey)
    {
      setLastSelected(varIndex);
      let newSelected = selected.slice(0);
      // Invert the selected state, so Ctrl + click will either selecte unselected, or unselect selected.
      newSelected[varIndex] = !newSelected[varIndex];
      setSelected(newSelected);
    }
    else
    {
      // Set last selected to current variable
      setLastSelected(varIndex);

      // Set all selected to false
      let newSelected = selected.map(x => false);
      // Set selected to true on current variable
      newSelected[varIndex] = true;
      setSelected(newSelected);
    }
  }

  const propertiesItems = props.properties.map((property, indexProps) => {
    if(property.type == 'bool')
    {
      return (
        <th className='bool property-start property-end no-wrap px-2 py-2'
          key={indexProps} 
        >
          <span>{property.name}</span>
          <i className={`fa fa-toggle-on select-all-button button ${anyVariablesSelected() ? "" : "disabled"}`}
             onClick={anyVariablesSelected() ? checkAll : void(0)}
             title={anyVariablesSelected() ? "Toggle selected rows" : "No rows selected"}
          />
        </th>
      );
    }
    else if(property.type == 'select')
    {
      return (
        property.values.map((value, indexVals, array) => 
          ( 
            <th 
              className={`select no-wrap px-2 py-2
                ${indexVals==0 ? "property-start" : ""} 
                ${indexVals==array.length-1 ? "property-end" : ""}`} 
              key={indexVals}
            >
              <span>{value}</span>
              <i className={`fa fa-toggle-on select-all-button button ${anyVariablesSelected() ? "" : "disabled"}`}
                 title={anyVariablesSelected() ? "Toggle selected rows" : "No rows selected"}
                 data-property={value}
                 onClick={anyVariablesSelected() ? selectAll : void(0)}
              />
            </th>
          )
        )
      );
    }
    
  });

  // Figure out if radio button should be disabled
  function disabledRadioButton(property, value, variable) {
    // Check if we have a disabledValue defined for this radio button
    let disabledValue = property.disabledValues && property.disabledValues[value] && property.disabledValues[value].indexOf(variable.index) > -1;
    // Also return disabled if the entire variable is disabled
    return variable.disabled || disabledValue ? 'disabled' : false;
  }

  const variablesItems = props.variables.map((variable, indexVars, arrayVars) => {
    return (
    <tr key={indexVars}
      title={variable.tooltip ? variable.tooltip : undefined}
      style={{display: variable.hidden ? 'none' : ''}}
      className={`${selected[indexVars] ? 'selected' : ''} ${lastSelected == indexVars ? 'lastSelected' : ''} ${variable.disabled ? 'disabled' : ''}`}
    >
      <th className='force-wrap px-2 py-1' 
        onClick={(event) => select(event, indexVars)}>
        {variable.name}
      </th>
      {
        props.properties.map((property, indexProps, arrayProps) => {
          if(property.type == 'bool')
          {
            return (
              <td 
                className='bool property-start property-end align-middle px-2 py-1'
                key={property.name + indexProps}
              >
                <input type='checkbox'
                  name={variable.index}
                  value='true'
                  disabled={variable.disabled ? 'disabled' : false}
                  defaultChecked={variable[property.name] ? 'checked' : false}
                />
              </td>
            );
          }
          else if(property.type == 'select')
          {
            return (
              property.values.map((value, indexVals, arrayVals) => 
                (
                  <td 
                    className={`select align-middle px-2 py-1
                      ${indexVals == 0 ? 'property-start' : ''} 
                      ${indexVals == arrayVals.length-1 ? 'property-end' : ''}`}
                    key={property.name + indexProps + value + indexVals}
                  >
                    <input 
                      type='radio'
                      name={variable.index}
                      value={value}
                      disabled={disabledRadioButton(property, value, variable)}
                      checked={value == variable[property.name] ? 'checked' : false}
                      onChange={props.onChange}
                    />
                  </td>
                )
              )
            );
          }
        })
      }
    </tr>
    );
  });

  return (
    <div className={`slycat-table-ingestion ${props.uniqueID}`}>
      <table>
        <thead>
          <tr>
            <th />
            {propertiesItems}
          </tr>
        </thead>
        <tbody>
          {variablesItems}
        </tbody>
      </table>
    </div>
  );
}