/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define('slycat-stl-model', ['slycat-web-client', 'knockout', 'knockout-mapping', 'URI', 'domReady!'], function(client, ko, mapping, URI) {
  ko.applyBindings({}, document.getElementsByClassName('slycat-content')[0]);
});
