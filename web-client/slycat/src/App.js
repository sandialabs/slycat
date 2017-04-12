import React, { Component } from 'react';
import logo from './media/slycat-brand.png';
import './App.css';
import Projects from './components/projects'
import Navigation from './components/navigation'

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
          To get started, edit <code>src/App.js</code>
           and save to reload.
        </p>
      </div>
    );
  }
}

export default App;
