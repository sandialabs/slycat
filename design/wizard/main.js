require.config(
{
  paths:
  {
    "angular" : "https://ajax.googleapis.com/ajax/libs/angularjs/1.2.16/angular.min",
    "angular_amd" : "http://cdn.jsdelivr.net/angular.amd/0.2/angularAMD.min",
  },
  shim:
  {
    "angular_amd" : ["angular"],
  }
});

define(["angular_amd"], function(angular_amd)
{
  var app = angular.module("wizard-app", []);

  app.controller("wizard-controller", function($scope)
  {
    $scope.a = 5;
    $scope.b = 3;
    $scope.template = "";

    $scope.set_template = function(template)
    {
      $scope.template = template + ".html";
    }
  });

  app.controller("math-controller", function($scope)
  {
    $scope.operator = "+";
    $scope.result = $scope.a + $scope.b;
  });

  app.controller("string-controller", function($scope)
  {
    $scope.operator = "+";
    $scope.result = $scope.a + "" + $scope.b;
  });

  angular_amd.bootstrap(app);
});
