/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import ko from 'knockout';
import api_root from 'js/slycat-api-root';

var slycat_passwordrequired = ko.observable(true);
var ssh_passwordrequired = ko.observable(true);

$.ajax({
  contentType: 'application/json',
  type: 'GET',
  url: api_root + 'remotes/show/user-password',
  success: function(result) {
    slycat_passwordrequired(result.slycat);
    ssh_passwordrequired(result.ssh);
  },
  error: function(request, status, reason_phrase) {
    
  }
});

export default {slycat_passwordrequired: slycat_passwordrequired, ssh_passwordrequired: ssh_passwordrequired};