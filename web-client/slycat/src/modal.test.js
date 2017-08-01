import React from 'react';
import ReactDOM from 'react-dom';
import myModal from 'modal';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<MyModal />, div);
});
