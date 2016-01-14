/* app.js */
console.log( "loaded" );

require(["jquery", "URI"], function($, URI)
{
  function login()
  {
    user_name = b64EncodeUnicode(document.getElementById("username").value)
    password = b64EncodeUnicode(document.getElementById("password").value)
    var sendInfo = JSON.stringify(
      {
        "user_name": user_name,
        "password": password
      }
    );

    $.ajax(
    {
      contentType: "application/json",
      type: "POST",
      url: URI("/" + "login"),
      success: function(result)
      {
        console.log("success " + result);
        window.location.replace("/");
      },
      error: function(request, status, reason_phrase)
      {
        console.log("error request:" + request.responseJSON +" status: "+ status + " reason: " + reason_phrase);
        $("#signin-alert").show(200);
      },
      data: sendInfo
    });

    console.log("done")
  }

//  function logout()
//  {
//    console.log("logging out");
//    $.ajax(
//    {
//      type: "DELETE",
//      url: "/" + "logout",
//      success: function()
//      {
//        console.log("success")
//      },
//      error: function(request, status, reason_phrase)
//      {
//        console.log("fail")
//      },
//    });
//  }
  function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}
  document.getElementById("go").addEventListener("click", login, false);
  $("form").submit(function(e) {
    e.preventDefault();
    //login();
  });
  //document.getElementById("logout").addEventListener("click", logout, false);
});