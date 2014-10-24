define(["app"], function(app)
{
  console.log("math.js");

  return app.register.controller("math-controller", function($scope)
  {
    console.log("math-controller");
    $scope.operator = "+";
    $scope.result = $scope.a + $scope.b;
  });
});


