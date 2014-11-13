(function()
{
  $(document).ready(function()
  {
    var server_root = document.getElementById("slycat-server-root").getAttribute("href");

    $("#matrix-demo-model").height($(window).height() - 300);
    $(window).resize(function()
    {
      $("#matrix-demo-model").height($(window).height() - 300);
    });

    $("#matrix-demo-model").layout({ applyDefaultStyles: true});
/*
  var request = new XMLHttpRequest();
  request.open("GET", "#")
  request.setRequestHeader("accept", "application/json");
  request.onload = function()
  {
    var model = JSON.parse(this.responseText);
    document.querySelector("#operand-a").innerHTML = "A: " + model["artifact:a"]
    document.querySelector("#operand-b").innerHTML = "B: " + model["artifact:b"]
    document.querySelector("#add").onclick = function()
    {
      var request = new XMLHttpRequest();
      request.open("GET", window.location.href + "/commands/add");
      request.onload = function()
      {
        var result = JSON.parse(this.responseText);
        document.querySelector("#result").innerHTML = "A + B = " + result;
      }
      request.send();
    };
    document.querySelector("#subtract").onclick = function()
    {
      var request = new XMLHttpRequest();
      request.open("GET", window.location.href + "/commands/subtract");
      request.onload = function()
      {
        var result = JSON.parse(this.responseText);
        document.querySelector("#result").innerHTML = "A - B = " + result;
      }
      request.send();
    };
  };
  request.send();
*/
  });
})();
