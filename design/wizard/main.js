require.config(
{
  paths:
  {
    "angular" : "https://ajax.googleapis.com/ajax/libs/angularjs/1.2.16/angular.min",
  },
  shim:
  {
    "angular" : { exports : "angular" },
  },
});

require(["angular", "wizard-controller"], function(angular)
{
  angular.bootstrap(document, ["wizard-app"]);
});

