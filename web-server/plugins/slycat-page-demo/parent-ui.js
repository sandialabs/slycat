/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-page-demo-model", ["slycat-server-root", "slycat-bookmark-manager", "slycat-web-client", "knockout", "lodash", "URI", "domReady!"], function(server_root, bookmark_manager, client, ko, lodash, URI)
{
  var page = {};
  page.closing = false;
  page.children = ko.observableArray();
  page.add_child = function()
  {
    page.children.push(window.open(URI().addSearch({"ptype":"page-demo-child","role":"new-child"})));
  }
  page.send_message = function()
  {
    lodash.each(page.children(), function(child)
    {
      child.postMessage("Sample message", URI().scheme() + "://" + URI().host());
    });
  }
  page.send_arraybuffer = function()
  {
    lodash.each(page.children(), function(child)
    {
      child.postMessage(new ArrayBuffer(8), URI().scheme() + "://" + URI().host());
    });
  }
  page.send_observable = function()
  {
    lodash.each(page.children(), function(child)
    {
      child.postMessage(ko.observableArray([1, 2, 3]), URI().scheme() + "://" + URI().host());
    });
  }
  page.close_children = function()
  {
    lodash.each(page.children(), function(child)
    {
      child.close();
    });
  }

  ko.applyBindings(page, document.getElementById("slycat-page-demo"));

  window.addEventListener("message", function(event)
  {
    console.log(event);

    if(event.origin !== URI().scheme() + "://" + URI().host())
      return;

    if(event.data === "open")
    {
      page.bookmark.updateState({children: page.children().length});
    }

    if(event.data === "closing")
    {
      if(!page.closing)
      {
        page.children.remove(event.source);
        page.bookmark.updateState({children: page.children().length});
      }
    }
  });

  window.addEventListener("beforeunload", function(event)
  {
    page.closing = true;
    if(page.children().length)
    {
      var message = "This will affect all related tabs / windows.";
      event.returnValue = message;
      return message;
    }
  });

  window.addEventListener("unload", function(event)
  {
    lodash.each(page.children(), function(child)
    {
      child.close();
    });
  });

  client.get_model(
  {
    mid: URI(window.location).segment(-1),
    success: function(model)
    {
      page.bookmark = bookmark_manager.create(model.project, model._id);
      page.bookmark.bid.subscribe(function(bid)
      {
        lodash.each(page.children(), function(child)
        {
          child.postMessage({"bid":bid}, URI().scheme() + "://" + URI().host());
        });
      });
      page.bookmark.getState(function(state)
      {
        console.log("bookmark state:", state);
        if("children" in state)
        {
          for(var i = 0; i != state.children; ++i)
          {
            var child = window.open(URI().addSearch({"ptype":"page-demo-child", "role":"new-child"}));
            if(child)
            {
              page.children.push(child);
            }
            else
            {
              window.alert("This visualization includes multiple pages, but it looks like you have a popup-blocker.");
              break;
            }
          }
        }
      });
    }
  });

});

