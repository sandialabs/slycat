import React from "react";

class ControlsDropdown extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let optionItems = this.props.items.map((item) =>
      <a href="#" key={item.key} tabIndex="-1" className={'dropdown-item' + (item.key == this.props.selected ? ' active' : '')}
        onClick={(e) => this.props.set_selected(this.props.state_label, item.key, this.props.trigger, e)}>
        {item.name}
      </a>);

    let dropdown = 
        <React.Fragment>
        <button className={`btn dropdown-toggle btn-sm ${this.props.button_style}`} type="button" id={this.props.id} data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" title={this.props.title}>
          {this.props.label}&nbsp;
        </button>
        <div className="dropdown-menu" aria-labelledby={this.props.id}>
          {optionItems}
        </div>
        </React.Fragment>;

    return (
      <React.Fragment>
      {this.props.single != true ? (
        <div className="btn-group">
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

export default ControlsDropdown