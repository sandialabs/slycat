/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import React, { Component } from 'react';
import logo from './media/slycat-brand.png';
import './App.css';
import Projects from './components/projects'
import Navigation from './components/navigation'
import ReactDOM from 'react-dom';




  
class App extends Component  {
  render() {
    return (
      <div className="">
      <Navigation.MainNavbar value="APP hello" />
        <div className="App-header">
          <h2></h2>
          <img src={logo} className="App-logo" alt="logo" />
          <h2><Projects value="APP hello" /></h2>        
          </div>
        <p className="App-intro">
          To get started, edit <code> src/App.js </code>
           and save to reload.

        </p>

      </div>
    );
  }
}
export default App;
//(505) 845-0495
 