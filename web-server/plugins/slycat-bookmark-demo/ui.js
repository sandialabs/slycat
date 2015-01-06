/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-bookmark-demo", ["slycat-web-client", "slycat-bookmark-manager", "domReady!"], function(client, bookmark_manager)
{
  var bookmarker = null;

  // Load the model.
  client.get_model(
  {
    mid: location.pathname.split("/").reverse()[0],
    success: function(model)
    {
      // Create the bookmark manager.
      bookmarker = bookmark_manager.create(model.project, model._id);

      // Get the current bookmarked state.
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

