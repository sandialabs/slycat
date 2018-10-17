import React from "react";
import { connect } from 'react-redux'
import { colorSwitcherAction } from '../Actions/color-switcher-action.js'

class ControlsDropdown extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let optionItems = this.props.items.map((item) =>
      <li role='presentation' key={item.key} className={item.key == this.props.selected ? 'active' : ''}>
        <a role="menuitem" tabIndex="-1" onClick={this.saySomething}>
          {item.name}
        </a>
      </li>);

    let dropdown =
        <React.Fragment>
        <button className="btn btn-default dropdown-toggle" type="button" id={this.props.id} data-toggle="dropdown" aria-expanded="true" title={this.props.title}>
          {this.props.label}&nbsp;
          <span className="caret"></span>
        </button>
        <ul className="dropdown-menu" role="menu" aria-labelledby={this.props.id}>
          {optionItems}
        </ul>
        </React.Fragment>;

    return (
      <React.Fragment>
      {this.props.single != true ? (
        <div className="btn-group btn-group-xs">
          {dropdown}
        </div>
      ) : (
        <React.Fragment>
        {dropdown}
        </React.Fragment>
      )}
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state) => ({
  whatsUp: state.say,
  stateObject: state
})

const mapDispatchToProps = (dispatch) => ({
  saySomething: () => { console.log("Yo"); dispatch(colorSwitcherAction());}
})

ControlsDropdown = connect(
  mapStateToProps,
  mapDispatchToProps
)(ControlsDropdown)

export default ControlsDropdown