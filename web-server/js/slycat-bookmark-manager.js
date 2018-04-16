/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define("slycat-bookmark-manager", ["slycat-server-root", "URI", "jquery", "lodash"], function(server_root, URI, $, lodash)
{
  var module = {};

  module.current_bid = function(bid)
  {
    if(bid !== undefined) // Caller wants to set a new bid.
    {
      var new_location = URI(window.location).removeQuery("bid");

      if(bid === null) // Caller is clearing the bid.
      {
        localStorage.removeItem(module.current_mid());
      }
      else // Caller is setting a non-null bid.
      {
        localStorage[module.current_mid()] = bid;
        new_location.addQuery("bid", bid);
      }

      window.location = new_location;
    }
    else // No bid was specified, so return the current bid (if any).
    {
      return URI(window.location).query(true).bid;
    }
  }

  module.current_mid = function()
  {
    var uri = URI(window.location);
    return uri.segment(-2) == "models" ? uri.segment(-1) : null;
  }

  module.create = function(pid, mid)
  {
    var manager = {};
    var bid_callbacks = [];

    var bid = null;
    var current_location = URI(window.location);
    if(current_location.query(true).bid == 'clear')
    {
      // Remove the current model ID from localStorage to clear it
      localStorage.removeItem(mid);
      // Do nothing more to allow bookmark state to clear
    }
    else if(current_location.query(true).bid)
    {
      bid = current_location.query(true).bid;
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
      var new_location = URI(window.location).removeQuery("bid").addQuery("bid", bid);
      window.history.replaceState( null, null, new_location.toString() );
      lodash.each(bid_callbacks, function(callback)
      {
        callback(bid);
      });
      // Consider using window.history.pushState instead to enable back button navigation within the model
    }

    manager.bid = {};
    manager.bid.subscribe = function(callback)
    {
      bid_callbacks.push(callback);
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
        data: JSON.stringify(state),
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
