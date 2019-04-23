// import React from "react";
// import ControlsDropdown from './ControlsDropdown';
//
// class FilterBar extends React.Component {
//     constructor(props) {
//         super(props);
//
//         this.state = {
//             selection: this.props.selection,
//         };
//
//         this.state[this.props.dropdown.state_label] = this.props.dropdown.selected;
//
//         this.set_selected = this.set_selected.bind(this);
//     }
//
//     set_selected(state_label, key, trigger, e) {
//         if(key == this.state[state_label]) {
//             return;
//         }
//
//         const obj = {};
//         obj[state_label] = key;
//         this.setState((prevState, props) => (obj));
//         this.state.selection = key;
//
//         this.props.element.trigger(trigger, key);
//     }
//
//     get_selected_filter() {
//         if(this.state.selection = null) {
//             return null;
//         }
//         else {
//             return this.state.selection;
//         }
//     }
//
//     render() {
//         return (
//             <ControlsDropdown key={this.props.dropdown[0].id} id{this.props.dropdown[0].id} label={this.props.dropdown[0].label} titl={this.props.dropdown[0].title}
//                               state_label={this.props.dropdown[0].state_label} trigger={this.props.dropdown[0].trigger}
//                               items={this.props.dropdown[0].items}
//                               selected={this.state[this.props.dropdown[0].state_label]} set_selected={this.set_selected}/>
//         );
//     }
// }
//
// export default FilterBar