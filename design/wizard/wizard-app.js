define(["angular"], function(angular)
{
  var app = angular.module("wizard-app", []);

  app.config(["$controllerProvider", function($controllerProvider)
  {
    app.register = { controller : $controllerProvider.register };
  }]);

  return app;
});

