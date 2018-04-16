/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define("slycat-matrix-demo-model", ["slycat-web-client", "knockout", "knockout-mapping", "URI", "domReady!"], function(client, ko, mapping, URI)
{
  // Setup the default window layout.
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

  // Setup storage for the page's data.
  var page = {};
  page.model_id = ko.observable(URI(window.location).segment(-1));
  page.product_type = ko.observable(null);
  page.matrix_a = mapping.fromJS([]);
  page.matrix_b = mapping.fromJS([]);
  page.matrix_product = mapping.fromJS([]);
  ko.applyBindings(page, document.getElementById("matrix-demo-model"));

  // Initially load the two input matrices.
  function get_matrix(aid, storage)
  {
    client.get_model_arrayset_data(
    {
      mid: page.model_id(),
      aid: aid,
      hyperchunks: "0/0/...", // Load array 0, attribute 0, all data
      success : function(data)
      {
        mapping.fromJS(data[0], storage);
      },
    });
  }

  get_matrix("A", page.matrix_a);
  get_matrix("B", page.matrix_b);

  // Load the computed result whenever the product type changes.
  page.product_type.subscribe(function(product_type)
  {
    client.get_model_command(
    {
      mid: page.model_id(),
      type: "matrix-demo",
      command: "product",
      parameters: { "product-type" : product_type },
      success : function(result)
      {
        mapping.fromJS(result.data, page.matrix_product);
      }
    });
  });
});

