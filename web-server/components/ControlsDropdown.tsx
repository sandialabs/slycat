// This is a copy of components/ControlsDropdown that uses internal state. It needs to be
// switched out for components/ControlsDropdown when the Parameter Space model is converted
// to use Redux across the entire model.

import React from "react";

export interface IDropdownItems {
  key?: number | string;
  name?: string;
  type?: "divider" | "header";
  style?: {};
  set_selected?: SetSelectedFunction;
  selected?: boolean;
}

export type SetSelectedFunction = (
  key: number | string,
  state_label: string,
  trigger?: string,
  e?: React.MouseEvent<HTMLButtonElement>,
  props?: Record<string, unknown>,
) => void;

interface ControlsDropdownProps {
  items: IDropdownItems[];
  selected: string | number;
  set_selected: SetSelectedFunction;
  state_label: string;
  trigger?: string;
  button_style: string;
  id: string;
  title: string;
  label: string;
  single?: boolean;
}

/**
 * React component used to create a dropdown.
 *
 *
 * @export
 * @class ControlsDropdown
 * @extends {React.Component<ControlsDropdownProps>}
 */

class ControlsDropdown extends React.Component<ControlsDropdownProps> {
  constructor(props: ControlsDropdownProps) {
    super(props);
  }

  makeItem = (item: IDropdownItems, index: number) => {
    switch (item.type) {
      case "divider":
        return <div className="dropdown-divider" key={`divider-${index}`} />;
      case "header":
        return (
          <h6 className="dropdown-header" key={`header-${index}`}>
            {item.name}
          </h6>
        );
      default:
        // Get the set_selected function from the item if it's been set, or use the one passed in from props
        const set_selected_function = item.set_selected ?? this.props.set_selected;
        // There are many times when item.selected is undefined.
        // In those cases, we determine selected by looking at what's set in props.selected.
        // But in cases where item.selected is already set to true or false, we just go with that value.
        // This lets you specify the selected item on the item itself or by passing it as a prop, with the item taking precedence.
        const selected = item.selected ?? item.key == this.props.selected;
        return (
          <button
            type="button"
            key={item.key}
            className={"dropdown-item" + (selected ? " active" : "")}
            onClick={(e) =>
              set_selected_function(
                item.key!,
                this.props.state_label,
                this.props.trigger,
                e,
                this.props,
              )
            }
            style={item.style}
          >
            {item.name}
          </button>
        );
    }
  };

  render() {
    let optionItems = this.props.items.map((item, index) => this.makeItem(item, index));

    let dropdown = (
      <React.Fragment>
        <button
          type="button"
          id={this.props.id}
          data-toggle="dropdown"
          aria-haspopup="true"
          aria-expanded="false"
          className={`btn dropdown-toggle btn-sm ${this.props.button_style}`}
          title={this.props.title}
        >
          {this.props.label}&nbsp;
        </button>
        <div className="dropdown-menu" aria-labelledby={this.props.id}>
          {optionItems}
        </div>
      </React.Fragment>
    );

    return (
      <React.Fragment>
        {this.props.single != true ? (
          <div className="btn-group">{dropdown}</div>
        ) : (
          <React.Fragment>{dropdown}</React.Fragment>
        )}
      </React.Fragment>
    );
  }
}

export default ControlsDropdown;
