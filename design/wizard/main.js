console.log("main.js");

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
  },
  deps:["app"],
});

