import React, { useState } from "react";

export default function SlycatTableIngestion(props) {

  function anyVariablesSelected() {
    for(var i = 0; i < props.variables.length; i++)
    {
      if( props.variables[i].selected )
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
    console.log("selectAll");
  }

  function select(e) {
    console.log("select");
  }

  const propertiesItems = props.properties.map((property, indexProps) => {
    if(property.type == 'bool')
    {
      return (
        <th className='bool property-start property-end'
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
              className={`select ${indexVals==0 ? "property-start" : ""} ${indexVals==array.length-1 ? "property-end" : ""}`} 
              key={indexVals}
            >
              <span>{value}</span>
              <i className={`fa fa-toggle-on select-all-button button ${anyVariablesSelected() ? "" : "disabled"}`}
                 title={anyVariablesSelected() ? "Toggle selected rows" : "No rows selected"}
                 onClick={anyVariablesSelected() ? selectAll : void(0)}
              />
            </th>
          )
        )
      );
    }
    
  });

  const variablesItems = props.variables.map((variable, indexVars, arrayVars) => {
    return (
    <tr key={indexVars}
      title={variable.tooltip ? variable.tooltip : undefined}
      style={{display: variable.hidden ? 'none' : ''}}
      className={`${variable.selected ? 'selected' : ''} ${variable.lastSelected ? 'lastSelected' : ''} ${variable.disabled ? 'disabled' : ''}`}
    >
      <th onClick={select}>
        {variable.name}
      </th>
      {
        props.properties.map((property, indexProps, arrayProps) => {
          if(property.type == 'bool')
          {
            return (
              <td 
                className="bool property-start property-end"
                key={property.name + indexProps}
              >
                <input type="checkbox"
                  name={indexVars}
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
                    className={`select ${indexVals == 0 ? 'property-start' : ''} ${indexVals == arrayVals.length-1 ? 'property-end' : ''}`}
                    key={property.name + indexProps + value + indexVals}
                  >
                    <input 
                      type='radio'
                      name={indexVars}
                      value={value}
                      disabled={variable.disabled ? 'disabled' : false}
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
    <div className='slycat-table-ingestion'>
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