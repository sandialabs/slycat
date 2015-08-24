define('slycat-slurm-model', ['slycat-web-client', 'knockout', 'knockout-mapping', 'URI', 'domReady!'], function(client, ko, mapping, URI) {
  ko.applyBindings({}, document.getElementsByClassName('slycat-content')[0]);
});
