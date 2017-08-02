import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import MyModal from './modal';
import './css/index.css';

ReactDOM.render(
  <App />,
  document.getElementById('root')
);

//Renders react compopnent MyModal to the body of html document
ReactDOM.render(
  <MyModal />,
  document.getElementById('body')
);