/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-changes-feed", ["slycat-server-root", "slycat-web-client", "URI"], function(server_root, client, URI)
{
  var callbacks = [];
  var websocket = null;
  var started = false;

  function start()
  {
    if(started)
      return;
    started = true;

    var websocket_uri = URI(window.location).scheme("wss").path(server_root + "changes-feed");
    var websocket = new WebSocket(websocket_uri);
    websocket.onmessage = function(message)
    {
      var change = JSON.parse(message.data);
      for(var i = 0; i != callbacks.length; ++i)
        callbacks[i](change);
    }
  }

  var module = {};

  module.watch = function(callback)
  {
    callbacks.push(callback);
    start();
  }

  return module;
});
