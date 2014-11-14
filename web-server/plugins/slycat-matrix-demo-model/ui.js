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
        url : location.href + "/arraysets/" + aid + "/arrays/0/metadata",
        success : function(metadata)
        {
          $.ajax(
          {
            type : "GET",
            url : location.href + "/arraysets/" + aid + "/arrays/0/attributes/0/chunk?ranges=0," + metadata.dimensions[0].end + ",0," + metadata.dimensions[1].end,
            success : function(data)
            {
              callback(metadata, data);
            },
          });
        },
      });
    }

    function display_matrix(metadata, data)
    {
      console.log(this);
      console.log(metadata);
      console.log(data);
      for(var i = 0; i != metadata.dimensions[0].end; ++i)
      {
        var row = $("<tr>").appendTo(this);
        for(var j = 0; j != metadata.dimensions[1].end; ++j)
        {
          var cell = $("<td>").appendTo(row);
          cell.text(data[i][j]);
        }
      }
    }

    get_matrix("A", display_matrix.bind($("#matrix-a")));
    get_matrix("B", display_matrix.bind($("#matrix-b")));
  });
})();
