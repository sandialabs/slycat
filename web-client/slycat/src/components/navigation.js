// Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
// DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
// retains certain rights in this software.

import React, { Component } from 'react';
import './../css/slycat.css';
import './../css/namespaced-bootstrap.css';
import './../css/font-awesome.css';

var  Navigation ={
    MainNavbar : class MainNavbar extends Component  {
      render() {
        return (
          <div className="">
            <div className="bootstrap-styles zooming-modals">
              <div className="modal fade" id="slycat-wizard" data-backdrop="static">
                <div className="modal-dialog">
                  <div className="modal-content zoom-sensitive">
                  </div>
                </div>
              </div>
              <div className="modal fade" id="slycat-about">
                <div className="modal-dialog">
                  <div className="modal-content">
                    <div className="modal-body">
                      <div className="jumbotron">
                        <p>&hellip; is the web-based analysis and visualization platform created at Sandia National Laboratories.</p>
                      </div>
                      <p><small>Copyright 2013, Sandia Corporation. Under the terms of Contract DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain rights in this software.</small></p>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-default" data-dismiss="modal">Close</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }
    },

    ViewNavbar: class ViewNavbar extends Component  {
      render() {
        return (
          <div className="">
            {this.props.value}"from MainNavbar"
          </div>
        );
      }
    }
};

export default Navigation
