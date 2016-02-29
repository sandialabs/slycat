define('slycat-job-checker', ['knockout', 'knockout-mapping', 'slycat-server-root', 'URI', 'slycat-web-client', 'slycat-dialog'], function(ko, mapping, server_root, URI, client, dialog) {

  ko.components.register('slycat-job-checker', {
    viewModel: function(params) {

    },
    template: { require: 'text!' + server_root + 'templates/slycat-job-checker.html' }
  })

});
