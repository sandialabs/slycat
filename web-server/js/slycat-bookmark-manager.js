/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import api_root from 'js/slycat-api-root';
import URI from "urijs";
import _ from "lodash"; 

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
    _.each(bid_callbacks, function(callback)
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
    // State needs to be updated each time updateState is called
    $.extend(state, params); // Consider using deep merge by adding true as the first parameter. However, deep merging does not work with bookmarking of expanded and collapsed dendrogram nodes since they are passed as arrays
    
    // But we don't have to post the bookmark each time, so calling a seaparte postBookmark
    // function that is debounced (or throttled in the future?) to limit number of POSTs to the backend
    manager.postBookmark();
  }

  // Using debounce to only POST bookmark every 1/3 second (333 ms) so we don't 
  // inundate the server with dozens of requests per second when user does something
  // that updates state often, like drag a pin around the screen.
  manager.postBookmark = _.debounce(
    // This is the function that POSTs a bookmark to the server
    function(params)
    {
      // Store bookmark and update the bid
      if(req)
        req.abort();

      req = $.ajax({
        type : "POST",
        url : api_root + "projects/" + pid + "/bookmarks",
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
    }, 
    // How long to wait before actually running that function. 
    // Debounce just waits this long and then executes the last call to postBookmark.
    // But in the future we might want to use throttle function instead, which
    // would call postBookmark every 333 seconds.
    333
  );

  // Retrieves the state for the current bookmark id (asynchronous)
  manager.getState = function(callback)
  {
    if($.isEmptyObject(state) && !(bid == null))
    {
      $.ajax(
      {
        dataType: "json",
        url: api_root + "bookmarks/" + bid,
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

export default module;
