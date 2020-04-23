import React from "react";

class ControlsDropdown extends React.Component {
  constructor(props) {
    super(props);

    // Create a ref to the button
    this.dropdown_toggle = React.createRef();
    this.dropdown_menu = React.createRef();
  }

  componentDidMount() {
    // Need to add the event listener to the dropdown menu's parent element because:
    // "All dropdown events are fired at the .dropdown-menu’s parent element"
    // https://getbootstrap.com/docs/4.3/components/dropdowns/#events
    $(this.dropdown_menu.current.parentNode).on('shown.bs.dropdown', this._handleShowDropdown);
    // addEventListener does not work because Boostrap uses jQuery events, 
    // which are "namespaced" in a way that doesn't work with addEventListener.
    // this.dropdown_menu.current.parentNode.addEventListener('show.bs.dropdown', this._handleShowDropdown);
  }

  _handleShowDropdown = (e) => {
    // Get the dropdown menu inside the dropdown element container
    let menus = $('.dropdown-menu', e.currentTarget);
    // Get the container that holds the model's panes
    let container = $('.ui-layout-container').first();
    // Set the max height of each menu to 70px less than the container.
    // This prevents the menus from sticking out beyond the page and allows
    // them to be scrollable when they are too long.
    menus.css('max-height', (container.height() - 70) + 'px');
  }

  render() {
    let optionItems = this.props.items.map((item) =>
      (
        <a 
          href='#' 
          key={item.key} 
          className={'dropdown-item' + (item.key == this.props.selected ? ' active' : '')}
          onClick={(e) => this.props.set_selected(item.key, this.props.state_label, this.props.trigger, e)}
          style={item.style}
        >
          {item.name}
        </a>
      )
    );

    let dropdown = 
      (<React.Fragment>
        <button 
          type='button' 
          id={this.props.id} 
          aria-haspopup='true' 
          aria-expanded='false' 
          data-toggle='dropdown'
          className={`btn dropdown-toggle btn-sm ${this.props.button_style}`}
          title={this.props.title}
          ref={this.dropdown_toggle}
        >
          {this.props.label}&nbsp;
        </button>
        <div className='dropdown-menu'
          aria-labelledby={this.props.id}
          ref={this.dropdown_menu}
        >
          {optionItems}
        </div>
      </React.Fragment>);

    return (
      <React.Fragment>
      {this.props.single != true ? (
        <div className='btn-group'>
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