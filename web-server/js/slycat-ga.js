/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import client from 'js/slycat-web-client-webpack';
import ReactGA from 'react-ga';

$(document).ready(function() {

  client.get_configuration_ga_tracking_id({
    success: function(id) {
      // Initialize Google Analytics only if we have an ID that isn't empty or whitespace.
      // When ga-tracking-id is not set in web-server-config.ini, it returns "" as the id.
      if(id.trim() != "")
      {
        ReactGA.initialize(id);
      }
    },
    error: function(request, status, reason_phrase) {
      console.log("Unable to retrieve Google Analytics tracking id.");
    }
  });
});