define(["wizard-app"], function(app)
{
  app.register.controller("string-controller", ["$scope", function($scope)
  {
    $scope.operator = "+";
    $scope.result = $scope.a + "" + $scope.b;
  }]);
});


