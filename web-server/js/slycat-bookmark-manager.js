/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-bookmark-manager", ["slycat-server-root", "jquery"], function(server_root, $)
{
  var module = {};
  module.create = function(pid, mid)
  {
    var manager = {};

    var bid = null;
    if($.deparam.querystring().bid == 'clear')
    {
      // Remove the current model ID from localStorage to clear it
      localStorage.removeItem(mid);
      // Do nothing more to allow bookmark state to clear
    }
    else if($.deparam.querystring().bid != null)
    {
      bid = $.deparam.querystring().bid;
    }
    else if(localStorage.getItem(mid) != null)
    {
      bid = localStorage.getItem(mid);
      updateURL(bid);
    }
    var state = {}; // JSON object representing the state of the model UI
    var req = null; // ajax request

    // Updates the browser's URL with the bid (private)
    function updateURL(bid)
    {
      var url = $.param.querystring( window.location.toString(), {"bid" : bid} );
      window.history.replaceState( null, null, url );
      // Consider using window.history.pushState instead to enable back button navigation within the model
    }

    // Updates the bookmark state (privileged)
    manager.updateState = function(params)
    {
      $.extend(state, params); // Consider using deep merge by adding true as the first parameter. However, deep merging does not work with bookmarking of expanded and collapsed dendrogram nodes since they are passed as arrays

      // Store bookmark and update the bid
      if(req)
        req.abort();

      req = $.ajax({
        type : "POST",
        url : server_root + "projects/" + pid + "/bookmarks",
        contentType : "application/json",
        data: $.toJSON(state),
        processData: false,
        success: function(result)
        {
          bid = result.id;
          updateURL(bid);
          // Store latest bid in local storage
          if(mid != null)
            localStorage[mid] = bid;
          req = null;
        },
      });
    }

    // Retrieves the state for the current bookmark id (asynchronous)
    manager.getState = function(callback)
    {
      if($.isEmptyObject(state) && !(bid == null))
      {
        $.ajax(
        {
          dataType: "json",
          url: server_root + "bookmarks/" + bid,
          async: true,
          success: function(resp)
          {
            state = resp;
            callback(state);
          },
          error: function()
          {
            // Assume no state when we can't retrieve a bid
            state = {};
            callback(state);
          },
        });
      }
      else
      {
        callback(state);
      }
    }

    return manager;
  }

  return module;
});
