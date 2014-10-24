define(["angular_amd"], function(angular_amd)
{
  console.log("app.js");
  var app = angular.module("wizard-app", []);
  app.controller("wizard-controller", function($scope)
  {
    $scope.a = 1;
    $scope.b = 2;
  });
  document.querySelector("body").setAttribute("ng-controller", "wizard-controller");
  angular_amd.bootstrap(app);
});
