define(["wizard-app"], function(app)
{
  var controller_ctor = app.controller("wizard-controller", ["$scope", function($scope)
  {
    $scope.a = 5;
    $scope.b = 3;
    $scope.wizard_template = "";

    $scope.set_template = function(template)
    {
      require([template + ".js"], function()
      {
        $scope.wizard_template = template + ".html";
        $scope.$apply();
      });
    }
  }]);

  return controller_ctor;
});

