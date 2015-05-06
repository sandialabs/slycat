/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-page-demo-model", ["slycat-server-root", "knockout", "lodash", "domReady!"], function(server_root, ko, lodash)
{
  // Setup storage for the data we're going to plot.
  var page = {};
  page.children = ko.observableArray();
  page.add_child = function()
  {
    page.children.push(window.open(server_root + "resources/models/page-demo/child-ui.html"));
    lodash.each(page.children(), function(child)
    {
      child.postMessage("Child created", "*");
    });
  }
  page.send_message = function()
  {
    lodash.each(page.children(), function(child)
    {
      child.postMessage("Sample message", "*");
    });
  }
  page.send_arraybuffer = function()
  {
    lodash.each(page.children(), function(child)
    {
      child.postMessage(new ArrayBuffer(8), "*");
    });
  }
  page.send_observable = function()
  {
    lodash.each(page.children(), function(child)
    {
      child.postMessage(ko.observableArray([1, 2, 3]), "*");
    });
  }

  ko.applyBindings(page, document.getElementById("slycat-page-demo"));

  window.addEventListener("message", receive_message, false);
  function receive_message(event)
  {
    console.log(event);
  }
});

