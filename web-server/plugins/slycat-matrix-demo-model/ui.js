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
      this.empty();
      for(var i = 0; i != metadata.dimensions[0].end; ++i)
      {
        var row = $("<tr>").appendTo(this);
        for(var j = 0; j != metadata.dimensions[1].end; ++j)
        {
          var cell = $("<td>").appendTo(row);
          cell.text(data[i][j].toFixed(1));
        }
      }
    }

    get_matrix("A", display_matrix.bind($("#matrix-a")));
    get_matrix("B", display_matrix.bind($("#matrix-b")));

    // Wait for users to click buttons.
    function compute_product(type, callback)
    {
      $.ajax(
      {
        type : "GET",
        url : location.href + "/commands/" + type,
        success : function(result)
        {
          callback(result.metadata, result.data);
        }
      });
    }

    $("#product").click(function()
    {
      compute_product("product", display_matrix.bind($("#matrix-product")));
    });

    $("#hadamard-product").click(function()
    {
      compute_product("hadamard-product", display_matrix.bind($("#matrix-product")));
    });

    $("#kronecker-product").click(function()
    {
      compute_product("kronecker-product", display_matrix.bind($("#matrix-product")));
    });
  });
})();
