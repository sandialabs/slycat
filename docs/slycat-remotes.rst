.. _slycat-remotes:

slycat-remotes
==============

The slycat-remotes AMD module provides a high-level API for making a remote
connection to another host, when the hostname is known in advance, and maintaining
a pool of remote connections.

For example, once the module has been imported into the current namespace:

.. sourcecode:: js

  require(["slycat-remotes"], function(remotes)
  {
    // Use the module here
  });


A remote session can be created as follows (the user will be prompted for their username and password with a modal dialog):

.. sourcecode:: js

  remotes.login(
  {
    hostname: "localhost",
    success: function(sid)
    {
      // Do something with the remote session id
    },
  });

.. js:function:: slycat-remotes.login(params)

  Prompt the user for a username and password, and create a remote session:

  :param object params: a set of key/value login parameters:

    * hostname (string) - Required, remote hostname.
    * title (string) - Optional title for the login dialog.
    * message (string) - Optional message for the login dialog.
    * success (function) - Optional, called with the remote session ID when the remote connection is made.
    * cancel (function) - Optional, called if the user cancels making a connection.

  The user will be prompted for their login information until they are successful, or cancel the operation.

.. js:function:: slycat-remotes.create_pool()

  Create and return an object that manages a collection of remote sessions.

  :returns: an instance of slycat-remote.pool that manages a collection of remote sessions, organized by hostname.

.. js:function:: slycat-remotes.pool.get_remote(params)

  Retrieve an existing remote session ID for a given host, or prompt the user to create
  a new session.

  :param object params: a set of key/value parameters:

    * hostname (string) - Required remote hostname.
    * title (string) - Optional title for the login dialog, if the remote session doesn't already exist.
    * message (string) - Optional message for the login dialog, if the remote session doesn't already exist.
    * success (function) - Optional, called with the remote session ID if it already exists, or the user successfully creates a new session.
    * cancel (function) - Optional, called if the host connection doesn't already exist, and the user cancels session creation.

.. js:function:: slycat-remotes.pool.delete_remote(hostname)

  Shut-down and remove the remote session (if any) for the given host.

  :param string hostname: the host whose session should be closed.  Calls with unknown hostnames will be quietly ignored.

  Note that this method could cause a harmless failed AJAX request, if the given session has already expired.

See Also
--------

- :ref:`slycat-login-controls` - for a lower-level set of login controls.
- :ref:`slycat-remote-controls` - for a lower-level set of hostname + login controls.

