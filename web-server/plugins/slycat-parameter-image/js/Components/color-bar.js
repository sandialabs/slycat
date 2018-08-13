import React from "react";
import ControlsDropdown from './controls-dropdown';
import { connect } from 'react-redux';
import { helloWorldAction } from './Actions';

const mapStateToProps = (state) => ({
    yoYo: state.say,
    stateObject: state
})

const mapDispatchToProps = (dispatch) => ({
    saySomething: () => { dispatch(sayHello()) }
})

class ColorBar extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
        selection: this.props.dropdown[0].selected,
      };

        this.state[this.props.dropdown.state_label] = this.props.dropdown.selected;

        this.set_selected = this.set_selected.bind(this);
    }

    set_selected(state_label, key, trigger, e) {
      // Do nothing if the state hasn't changed (e.g., user clicked on currently selected variable)
      if(key == this.state[state_label])
      {
        return;
      }
      // That function will receive the previous state as the first argument, and the props at the time the update is applied as the
      // second argument. This format is favored because this.props and this.state may be updated asynchronously,
      // you should not rely on their values for calculating the next state.
      const obj = {};
      obj[state_label] = key;
      this.setState((prevState, props) => (obj));
      this.state.selection = key;

      // This is the legacy way of letting the rest of non-React components that the state changed. Remove once we are converted to React.
      this.props.element.trigger(trigger, key);
  }

  get_selected_colormap() {
      if(this.state.selection == null) {
          return "night";
      }
      else {
        return this.state.selection;
      }
  }

    render() {

        return (
            <ControlsDropdown key={this.props.dropdown[0].id} id={this.props.dropdown[0].id} label={this.props.dropdown[0].label} title={this.props.dropdown[0].title}
                              state_label={this.props.dropdown[0].state_label} trigger={this.props.dropdown[0].trigger}
                              items={this.props.dropdown[0].items}
                              selected={this.state.selection} single={this.props.dropdown[0].single} set_selected={this.set_selected}/>);
    }
}

export default ColorBar