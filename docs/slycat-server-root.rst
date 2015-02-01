.. _slycat-server-root:
.. default-domain:: js

slycat-server-root
==================

Like any web service, the Slycat server could be deployed behind a reverse
proxy, altering the URLs used by a client to access the :ref:`rest-api`.  For
example, if an organization deployed an instance of Slycat at
`http://example.com/services/slycat`, clients would retrieve the list of
available projects at `/services/slycat/projects` instead of the usual
`/projects`.

To facilitate this, the slycat-server-root AMD module returns a single constant
string - the server root - which *must* be prepended to all URLs used by
clients.  For example, clients should never use hard-coded URLs:

.. code-block:: js

  jquery.ajax("/projects"); // NEVER DO THIS

Instead, the server root must be imported into the current namespace:

.. sourcecode:: js

  require(["slycat-server-root"], function(server_root)
  {
    // Use the server_root string here
  });

And used to construct URLs dynamically at runtime:

.. code-block:: js

  jquery.ajax(server_root + "projects");

Note that clients should rarely need to construct URLs in the first place -
instead, they should use the :ref:`slycat-web-client` module, which provides
simplified access to the :ref:`rest-api` and uses the server root for you.

