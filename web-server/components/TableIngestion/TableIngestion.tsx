import React, { useState } from "react";
import Icon from "components/Icons/Icon";
import styles from "./TableIngestion.module.scss";

type PropertySelect = {
  name: string;
  type: "select";
  values: string[];
  disabledValues?: Record<string, Array<number | string>>;
};

type PropertyBool = {
  name: string;
  type: "bool";
};

type Property = PropertySelect | PropertyBool;

type BaseVariable = {
  name: string;
  index: number | string;
  selected: boolean;
  disabled?: boolean;
  hidden?: boolean;
  tooltip?: string;
  // Additional dynamic properties keyed by property.name
  [key: string]: unknown;
};

type OnChangeArg = { currentTarget: HTMLInputElement };
type OnBatchChangeArg = { batchTarget: HTMLInputElement[] };

type Props = {
  uniqueID: string;
  variables: BaseVariable[];
  properties: Property[];
  onChange: (e: OnChangeArg) => void;
  onBatchChange?: (e: OnBatchChangeArg) => void;
};

export default function TableIngestion(props: Props) {
  const [selected, setSelected] = useState<boolean[]>(
    props.variables.map((variable) => Boolean(variable.selected)),
  );
  const [lastSelected, setLastSelected] = useState<number>(-1);

  function anyVariablesSelected(): boolean {
    for (let i = 0; i < selected.length; i++) {
      if (selected[i]) {
        return true;
      }
    }
    return false;
  }

  function checkAll(e: React.MouseEvent<SVGSVGElement>) {
    // Placeholder: existing behavior was a no-op (console log)
    // Keep function for parity and potential future implementation
    // eslint-disable-next-line no-console
    console.log("checkAll");
  }

  function selectAll(e: React.MouseEvent<SVGSVGElement>) {
    const property = e.currentTarget.getAttribute("data-property");
    if (!property) return;
    const batchRadio: HTMLInputElement[] = [];
    for (const [index, variableSelected] of selected.entries()) {
      if (variableSelected) {
        const selector = `.${props.uniqueID} input[value='${property}'][name='${index}']`;
        const radio = document.querySelector<HTMLInputElement>(selector);
        if (radio && !radio.disabled) {
          batchRadio.push(radio);
          props.onChange({ currentTarget: radio });
        }
      }
    }
    if (props.onBatchChange) {
      props.onBatchChange({ batchTarget: batchRadio });
    }
  }

  function select(event: React.MouseEvent<HTMLElement>, varIndex: number) {
    if (props.variables[varIndex].disabled) {
      return;
    } else if (event.shiftKey) {
      const begin = Math.min(lastSelected, varIndex);
      const end = Math.max(lastSelected, varIndex);
      const newSelected = selected.slice(0);
      for (let i = begin; i <= end; i++) {
        if (!props.variables[i].disabled) {
          newSelected[i] = true;
        }
      }
      setSelected(newSelected);
      setLastSelected(varIndex);
    } else if (event.ctrlKey || event.metaKey) {
      setLastSelected(varIndex);
      const newSelected = selected.slice(0);
      newSelected[varIndex] = !newSelected[varIndex];
      setSelected(newSelected);
    } else {
      setLastSelected(varIndex);
      const newSelected = selected.map(() => false);
      newSelected[varIndex] = true;
      setSelected(newSelected);
    }
  }

  function disabledRadioButton(property: Property, value: string, variable: BaseVariable): boolean {
    if (property.type !== "select") return Boolean(variable.disabled);
    const disabledValue =
      property.disabledValues &&
      property.disabledValues[value] &&
      property.disabledValues[value].indexOf(variable.index) > -1;
    return Boolean(variable.disabled || disabledValue);
  }

  const propertiesItems = props.properties.map((property, indexProps) => {
    if (property.type === "bool") {
      return (
        <th
          className={`bool ${styles.propertyStart} ${styles.propertyEnd} no-wrap px-2 py-2`}
          key={indexProps}
        >
          <div>{property.name}</div>
          <Icon
            type="toggle-on"
            className={`${styles.selectAllButton} button ${anyVariablesSelected() ? "" : styles.disabled}`}
            onClick={anyVariablesSelected() ? checkAll : undefined}
            title={anyVariablesSelected() ? "Toggle selected rows" : "No rows selected"}
          />
        </th>
      );
    } else if (property.type === "select") {
      return property.values.map((value, indexVals, array) => (
        <th
          className={`select no-wrap px-2 py-2
                ${indexVals == 0 ? "property-start" : ""} 
                ${indexVals == array.length - 1 ? "property-end" : ""}`}
          key={indexVals}
        >
          <div>{value}</div>
          <Icon
            type="toggle-on"
            className={`${styles.selectAllButton} button ${anyVariablesSelected() ? "" : styles.disabled}`}
            title={anyVariablesSelected() ? "Toggle selected rows" : "No rows selected"}
            data-property={value}
            onClick={anyVariablesSelected() ? selectAll : undefined}
          />
        </th>
      ));
    }
    return null;
  });

  const variablesItems = props.variables.map((variable, indexVars) => {
    return (
      <tr
        key={indexVars}
        title={variable.tooltip ? String(variable.tooltip) : undefined}
        style={{ display: variable.hidden ? "none" : "" }}
        className={`${selected[indexVars] ? styles.selected : ""} ${lastSelected == indexVars ? styles.lastSelected : ""} ${variable.disabled ? styles.disabled : ""}`}
      >
        <th className="force-wrap px-2 py-1" onClick={(event) => select(event, indexVars)}>
          {variable.name}
        </th>
        {props.properties.map((property, indexProps) => {
          if (property.type === "bool") {
            return (
              <td
                className={`${styles.bool} ${styles.propertyStart} ${styles.propertyEnd} align-middle px-2 py-1`}
                key={property.name + indexProps}
              >
                <input
                  type="checkbox"
                  name={String(variable.index)}
                  value="true"
                  disabled={Boolean(variable.disabled)}
                  defaultChecked={Boolean(variable[property.name])}
                />
              </td>
            );
          } else if (property.type === "select") {
            return property.values.map((value, indexVals, arrayVals) => (
              <td
                className={`select align-middle px-2 py-1
                      ${indexVals == 0 ? "property-start" : ""} 
                      ${indexVals == arrayVals.length - 1 ? "property-end" : ""}`}
                key={property.name + indexProps + value + indexVals}
              >
                <input
                  type="radio"
                  name={String(variable.index)}
                  value={value}
                  disabled={disabledRadioButton(property, value, variable)}
                  checked={value === (variable[property.name] as string)}
                  onChange={(e) => props.onChange({ currentTarget: e.currentTarget })}
                />
              </td>
            ));
          }
          return null;
        })}
      </tr>
    );
  });

  return (
    <div className={`${styles.TableIngestion} ${props.uniqueID}`}>
      <table>
        <thead>
          <tr>
            <th />
            {propertiesItems}
          </tr>
        </thead>
        <tbody>{variablesItems}</tbody>
      </table>
    </div>
  );
}
