/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

/*
Modal.js contains the modal which opens up the X3D file viewer
*/


//Dependencies
import React, { Component } from 'react';
import Projects from './components/projects';
import ReactDOM from 'react-dom';
import Iframe from 'react-iframe';
import pym from 'pym.js';
import Modal from 'react-modal';
import './App.css';

 
//Positions modal in the center
 const customStyles = {
  content : {
    top                   : '50%',
    left                  : '50%',
    right                 : 'auto',
    bottom                : 'auto',
    marginRight           : '-50%',
    transform             : 'translate(-50%, -50%)'
  }
};
 

//React Component Mymodal
var MyModal = React.createClass({
 
 //Sets initial state of modal to false, meaning it will be closed when webpage is loaded
  getInitialState: function() {
    return { modalIsOpen: false };
  },
 
 //When the viewer button is click set "ModalIsOpen" to true, meaning the modal opens
  openModal: function() {
    this.setState(
      {
        modalIsOpen: true
      });

  },
 
  afterOpenModal: function() {
    // references are now sync'd and can be accessed. 
    //var view = document.getElementById("viewers");
    //var url = window.location.href + "?viewers='" + document.getElementById("viewers").getAttribute("size") +"'";
    //window.location.href = decodeURI(url);
  },
 //close modal
  closeModal: function() {
    this.setState({modalIsOpen: false});
  },
 //Render function decides what is drawn to the screen when myModal is rendered
  render: function() {
    return (
      <div>
        {/* Button to open modal    */}
        <button className='Btn' onClick={this.openModal}>Open X3D viewer</button>
        {/* Modal object  */}
        <Modal
          isOpen={this.state.modalIsOpen}
          onAfterOpen={this.afterOpenModal}
          onRequestClose={this.closeModal}
          style={customStyles}
          contentLabel="Example Modal"
        >
      {/*  iframe inside of modal holds x3d viewer.html */}
        <div class="scrollable">
    	     <iframe id="view" frameBorder="0" scrolling="yes" height ="700px" width= "1400px" src='viewer.html?viewers=1&position=-2.43383%201.07351%20-1.28700&orientation=-0.00318%20-0.99950%20-0.03159%202.06609'></iframe>
    	 </div>
        </Modal>
      </div>
    );
  }
});

export default MyModal;
