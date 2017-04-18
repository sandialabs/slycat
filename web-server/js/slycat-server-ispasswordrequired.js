/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-server-ispasswordrequired", ['knockout', 'slycat-server-root'], function(ko, server_root)
{

  var slycat_passwordrequired = ko.observable(true);
  var ssh_passwordrequired = ko.observable(true);


  $.ajax({
    contentType: 'application/json',
    type: 'GET',
    url: server_root + 'remotes/show/user-password',
    success: function(result) {
      slycat_passwordrequired(result.slycat);
      ssh_passwordrequired(result.ssh);
    },
    error: function(request, status, reason_phrase) {
      
    }
  });

  return {slycat_passwordrequired: slycat_passwordrequired, ssh_passwordrequired: ssh_passwordrequired};

});
