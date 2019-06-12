.. _slycat-web-client:

slycat-web-client
=================

The slycat-web-client AMD module provides convenient Javascript bindings
for the :ref:`rest-api`, in a style similar to :func:`jquery.ajax`.

For example, once the module has been imported into the current namespace:

.. sourcecode:: js

  require(["slycat-web-client"], function(client)
  {
    // Use the module here
  });


A model can be retrieved using:

.. sourcecode:: js

  client.get_model(
  {
    mid: model_id, // Unique model identifier
    success: function(model)
    {
      // Do something with the model
    },
  });

.. js:function:: slycat-web-client.delete_model(params)

  Delete an existing model.

  :param object params: a set of key/value pairs that configure the request:

    * mid (string) - required, unique model identifier.
    * success (function) - optional, called when the request completes successfully.
    * error (function) - optional, called if the request fails.

      :param request:
      :param status:
      :param reason_phrase:

.. js:function:: slycat-web-client.delete_project(params)

  Delete an existing project.

  :param object params: a set of key/value pairs that configure the request:

    * pid (string) - required, unique project identifier.
    * success (function) - optional, called when the request completes successfully.
    * error (function) - optional, called if the request fails.

