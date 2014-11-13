(function()
{
  $(document).ready(function()
  {
    // Setup the default window layout.
    $("#matrix-demo-model").height($(window).height() - 300);

    $("#matrix-demo-model").layout(
    {
      applyDefaultStyles: true,
      west:
      {
        size: $(window).width() / 3,
      },
      east:
      {
        size: $(window).width() / 3,
      },
    });

    // When resizing the window, adjust the height of the layout.
    $(window).resize(function()
    {
      $("#matrix-demo-model").height($(window).height() - 300);
    });

    // Load and display the two matrix artifacts stored in the model.
    //var server_root = document.getElementById("slycat-server-root").getAttribute("href");

    function get_matrix(aid, callback)
    {
      $.ajax(
      {
        type : "GET",
        url : location.href + "/arraysets/" + aid + "/metadata",
        success : function(metadata)
        {
          callback(metadata);
        },
      });
    }

    function display_matrix(metadata, data)
    {
      console.log(metadata);
    }

    get_matrix("A", display_matrix);
    get_matrix("B", display_matrix);
  });
})();
