define(["wizard-app"], function(app)
{
  return app.register.controller("math-controller", ["$scope", function($scope)
  {
    $scope.operator = "+";
    $scope.result = $scope.a + $scope.b;
  }]);
});


