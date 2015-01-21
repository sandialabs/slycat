define("slycat-dialog", [], function()
{
  var module = {};

  module.ajax_error = function(message)
  {
    return function(request, status, reason_phrase)
    {
      window.alert(message + " " + reason_phrase);
    }
  }

  return module;
});
