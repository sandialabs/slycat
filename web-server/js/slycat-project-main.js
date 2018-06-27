/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

// CSS resources
import "css/namespaced-bootstrap.less";
import "css/slycat.css";

import server_root from 'js/slycat-server-root';
import client from 'js/slycat-web-client-webpack';
import markings from 'js/slycat-markings-webpack';
import dialog from 'js/slycat-dialog-webpack';
import model_names from 'js/slycat-model-names-webpack';
import ko from 'knockout';
import mapping from 'knockout-mapping';
import URI from 'urijs';
import "js/slycat-navbar-webpack";
import ga from "js/slycat-ga";
import "bootstrap";

// Wait for document ready
$(document).ready(function() {

  var page = {};
  page.server_root = server_root;
  page.project_id = URI(window.location).segment(-1);
  page.project = mapping.fromJS({
    _id: page.project_id, 
    name: "", 
    description: "",
    created: "",
    creator: "",
    acl:{administrators:[],writers:[],readers:[]}
  });
  page.projects = ko.observableArray();
  client.get_project({
    pid: page.project._id(),
    success: function(result) {
      page.projects.push(mapping.fromJS(result));
    },
    error: function(request, status, reason_phrase) {
      console.log("Unable to retrieve project.");
    }
  });

  page.title = ko.pureComputed(function()
  {
    var projects = page.projects();
    return projects.length ? projects[0].name() + " - Slycat Project" : "";
  });

  page.models = mapping.fromJS([]);
  client.get_project_models({
    pid: page.project._id(),
    success: function(result) {
      mapping.fromJS(result, page.models);
    },
    error: function(request, status, reason_phrase) {
      console.log("Unable to retrieve project models.");
    }
  });

  page.markings = markings.allowed;
  page.badge = function(marking)
  {
    for(var i = 0; i != page.markings().length; ++i)
    {
      if(page.markings()[i].type() == marking)
        return page.markings()[i].badge();
    }
  }

  var references = mapping.fromJS([]);

  page.templates = references.filter(function(reference)
  {
    return reference.bid() && !reference.mid();
  }).map(function(reference)
  {
    return {
      _id: reference._id,
      name: reference.name,
      created: reference.created,
      creator: reference.creator,
      model_type: reference["model-type"] ? reference["model-type"]() : "",
    };
  });
  
  page.model_names = model_names;
  
  page.edit_template = function(reference)
  {
  }
  page.delete_template = function(reference)
  {
    dialog.dialog(
    {
      title: "Delete Template?",
      message: "The template will be deleted immediately and there is no undo.  This will not affect any existing models.",
      buttons: [{className: "btn-default", label:"Cancel"}, {className: "btn-danger",label:"OK"}],
      callback: function(button)
      {
        if(button.label != "OK")
          return;
        client.delete_reference(
        {
          rid: reference._id(),
          success: function()
          {
            page.update_references();
          },
          error: dialog.ajax_error("Couldn't delete template."),
        });
      },
    });
  }

  page.update_references = function()
  {
    client.get_project_references(
    {
      pid: page.project._id(),
      success: function(result)
      {
        mapping.fromJS(result, references);
      }
    });
  }

  page.update_references();

  ko.applyBindings(page, document.querySelector("html"));

});
