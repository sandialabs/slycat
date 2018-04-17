/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */
require(["jquery", "URI"], function($, URI)
{
  /**
   * creates and submits json login payload to slycat server
   */
  function login()
  {
    //build json payload
    user_name = b64EncodeUnicode(document.getElementById("username").value);
    password = b64EncodeUnicode(document.getElementById("password").value);
    var sendInfo = JSON.stringify(
      {
        "user_name": user_name,
        "password": password,
        "location": window.location
      }
    );
    //send the request to login
    $.ajax(
    {
      contentType: "application/json",
      type: "POST",
      url: URI("/" + "login"),
      data: sendInfo,//json payload
      success: function(result)
      {
        console.log("success " + result);
        //window.location.replace("/");
        window.location.replace(result.target);
      },
      error: function(request, status, reason_phrase)
      {
        console.log("error request:" + request.responseJSON +" status: "+ status + " reason: " + reason_phrase);
        $("#signin-alert").show(200);
      }
    });
  }

  /**
   * takes a string and base64 encodes it
   * @param str
   * @returns {string} base 64 encoded
   */
  function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}
  document.getElementById("go").addEventListener("click", login, false);
  $("form").submit(function(e) {
    e.preventDefault();
  });
});