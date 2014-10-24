define(["app"], function(app)
{
  console.log("string.js");

  app.register.controller("string-controller", function($scope)
  {
    console.log("string-controller");
    $scope.operator = "+";
    $scope.result = $scope.a + "" + $scope.b;
  });
});


