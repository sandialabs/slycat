/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

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
