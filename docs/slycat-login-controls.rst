.. _slycat-login-controls:
.. default-domain:: js

slycat-login-controls
=====================

The slycat-login-controls AMD module registers a `Knockout <http://knockoutjs.com>`_
component of the same name.  The slycat-login-controls component provides a
standard GUI widget for selecting a username and password to complete a login.

Note: you don't need to import the slycat-login-controls module using
:func:`require` or :func:`define` - it registers the knockout component
automatically at startup.

To use slycat-login-controls, create :class:`ko.observable` objects for each of the login
parameters, including the username and password, and bind them to the page DOM:

.. code-block:: js

  var page =
  {
    username: ko.observable("fred"),
    password: ko.observable(""),
  };

  ko.applyBindings(page);

Then, embed the slycat-login-controls component in your markup and bind your observables
to the component parameters:

.. code-block:: html

  <p>Login to orbiting brain lasers:</p>
  <slycat-login-controls params="
    username: username,
    password: password,
    ">
  </slycat-login-controls>

Now, changes to any of the input parameters automatically update the login controls, and user interaction
with the login controls will update the `username` and `password` observables.

The full set of parameters supported by slycat-login-controls are as follows:

* username, :class:`ko.observable`: String username to be entered by the user.  If this parameter is null or empty, it will default to the last-used username.
* password, :class:`ko.observable`: String password to be entered by the user.
* status, :class:`ko.observable`: Optional string status message to be displayed under the controls.
* status_type, :class:`ko.observable`: Optional string status type that controls the appearance of the status message.  Must be one of "success", "info", "warning", or "danger".
* enable, :class:`ko.observable`: Optional boolean value to enable / disable the controls.
* activate, function: Optional callback function that will be invoked if the user presses the "enter" key while using the login controls.

See Also
--------

- :ref:`slycat-remote-controls` - if you also need to prompt users for a hostname.
- :ref:`slycat-remotes` - for a higher-level API that provides a modal login dialog, and can manage a pool of remote connections.

