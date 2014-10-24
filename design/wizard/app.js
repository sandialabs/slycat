define(["angular"], function()
{
  console.log("app.js");

  var app = angular.module("wizard-app", []);

  app.config(["$controllerProvider", function($controllerProvider)
  {
    app.register = { controller : $controllerProvider.register };
  }]);

  app.controller("wizard-controller", function($scope)
  {
    $scope.a = 5;
    $scope.b = 3;
    $scope.wizard_template = "";

    $scope.set_template = function(template)
    {
      require([template + ".js"], function()
      {
        console.log("template " + template + ".js loaded");
        $scope.wizard_template = template + ".html";
      });
    }
  });

  angular.bootstrap(document, ["wizard-app"]);

  return app;
});

