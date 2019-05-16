import * as React from 'react';

export interface NavBarProps { 
  navNames:string[]
  selectedNameIndex:Number
}

export interface NavBarState {
}

export default class NavBar extends React.Component<NavBarProps, NavBarState> {
  public constructor(props:NavBarProps) {
    super(props)
    this.state = {}
  }

  getNavItemsJSX = () => {
    const NavItemsJSX = this.props.navNames.map((navName, i) => {
      return (
        <li key={i} className={this.props.selectedNameIndex === i? "nav-item active": "nav-item"}>
          <a className="nav-link">{navName}</a>
        </li>
      )
    });
    return NavItemsJSX;
  }

  render () {
    return (
        <ul className="nav nav-pills">
          {this.getNavItemsJSX()}
        </ul>
    )
  }
}





