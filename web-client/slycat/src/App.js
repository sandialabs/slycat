import React, { Component } from 'react';
import logo from './media/slycat-brand.png';
import './App.css';
import Projects from './components/projects'

class App extends Component  {
  render() {
    return (
      <div className="App">
        <div className="App-header">
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
