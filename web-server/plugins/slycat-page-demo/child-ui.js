/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-page-demo-child-page", ["knockout", "URI"], function(ko, URI)
{
  // If this page is a new child, mark it as a child.
  if(URI().hasQuery("role", "new-child") === true)
  {
    window.history.replaceState(null, null, URI().setQuery("role", "child"));
  }
  // If this page is an orphan, close it.
  else if(URI().hasQuery("role", "orphan") === true)
  {
    window.close();
    return;
  }

  window.addEventListener("message", function(event)
  {
    console.log(event);

    if(event.origin !== URI().scheme() + "://" + URI().host() || event.source !== window.opener)
      return;

    // Synchronize with our parent's bid
    if("bid" in event.data)
    {
      window.history.replaceState(null, null, URI().setQuery("bid", event.data.bid));
    }
  });

  window.addEventListener("beforeunload", function(event)
  {
    // Mark ourselves as an orphan.
    window.history.replaceState(null, null, URI().setQuery("role", "orphan"));
  });

  window.addEventListener("unload", function(event)
  {
    // Notify our parent that we're closing.
    window.opener.postMessage("closing", URI().scheme() + "://" + URI().host());
  });

  // Notify our parent that we're open.
  window.opener.postMessage("open", URI().scheme() + "://" + URI().host());
});

