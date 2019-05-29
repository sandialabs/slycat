'use strict';
import * as React from 'react';

/**
 * @param {navNames} [] of strings to be displayed
 * @param {selectedNameIndex} index of navNames[] to highlight in grey
 */
export interface NavBarProps { 
  navNames:string[]
  selectedNameIndex:Number
}

/**
 * not used
 */
export interface NavBarState {
}
/**
 * class that creates a Navbar for use in tracking progress through say a wizard or
 * some other process
 */
export default class NavBar extends React.Component<NavBarProps, NavBarState> {
  /**
   * not used
   */
  public constructor(props:NavBarProps) {
    super(props)
    this.state = {}
  }

  /**
   * returns a list of nav-items for display
   * also highlights the nav-item from selectedNameIndex
   *
   * @memberof NavBar
   */
  private getNavItemsJSX = () => {
    const NavItemsJSX = this.props.navNames.map((navName, i) => {
      return (
        <li key={i} className={this.props.selectedNameIndex === i? "nav-item active": "nav-item"}>
          <a className="nav-link">{navName}</a>
        </li>
      )
    });
    return NavItemsJSX;
  }

  public render () {
    return (
      <ul className="nav nav-pills">
        {this.getNavItemsJSX()}
      </ul>
    )
  }
}
