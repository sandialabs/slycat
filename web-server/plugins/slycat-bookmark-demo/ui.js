/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-bookmark-demo-model", ["slycat-web-client", "slycat-bookmark-manager", "URI", "domReady!"], function(client, bookmark_manager, URI)
{
  var bookmarker = null;

  // Load the model - we need the owning project id to create a bookmark manager.
  client.get_model(
  {
    mid: URI(window.location).segment(-1),
    success: function(model)
    {
      // Create the bookmark manager.
      bookmarker = bookmark_manager.create(model.project, model._id);

      // Get the current bookmarked state (which could be empty if we've never
      // viewed this model before).
      bookmarker.getState(function(state)
      {
        // If we have previous state, display it.
        if("text" in state)
          $("#text").val(state.text);

        // Update the bookmarked state whenever the user makes changes.
        $("#save").on("click", function()
        {
          bookmarker.updateState({
            text: $("#text").val()
          });
        });
      });
    }
  });
});

