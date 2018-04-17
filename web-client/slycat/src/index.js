/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

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