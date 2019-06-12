.. _slycat-remote-controls:
.. default-domain:: js

slycat-remote-controls
======================

The slycat-remote-controls AMD module registers a `Knockout <http://knockoutjs.com>`_
component of the same name.  The slycat-remote-controls component provides a
standard GUI widget for selecting a hostname, username, and password to complete a login.

Note: you don't need to import the slycat-remote-controls module using
:func:`require` or :func:`define` - it registers the knockout component
automatically at startup.

To use slycat-remote-controls, create :class:`ko.observable` objects for each of the login
parameters, including the hostname, username and password, and bind them to the page DOM:

.. code-block:: js

  var page =
  {
    hostname: ko.observable("localhost"),
    username: ko.observable("fred"),
    password: ko.observable(""),
  };

  ko.applyBindings(page);

Then, embed the slycat-remote-controls component in your markup and bind your observables
to the component parameters:

.. code-block:: html

  <p>Login to mutant cybergoat server:</p>
  <slycat-remote-controls params="
    hostname: hostname,
    username: username,
    password: password,
    ">
  </slycat-remote-controls>

Now, changes to any of the input parameters automatically update the login controls, and user interaction
with the login controls will update the `username` and `password` observables.

The full set of parameters supported by slycat-remote-controls are as follows:

* hostname, :class:`ko.observable`: String hostname to be entered by the user.  If this parameter is null or empty, it will default to the last-used hostname.
* username, :class:`ko.observable`: String username to be entered by the user.  If this parameter is null or empty, it will default to the last-used username.
* password, :class:`ko.observable`: String password to be entered by the user.
* status, :class:`ko.observable`: Optional string status message to be displayed under the controls.
* status_type, :class:`ko.observable`: Optional string status type that controls the appearance of the status message.  Must be one of "success", "info", "warning", or "danger".
* enable, :class:`ko.observable`: Optional boolean value to enable / disable the controls.
* focus, :class:`ko.observable`: Optional, used to focus the controls.  Set to `"hostname"` to focus the hostname control, `"username"` to focus the username control, `"password"` to focus the password control, or `true` to automatically choose which control to focus.  Because the caller may wish to focus the same control more than once in a row (for example: to refocus the password control after a failed login attempt), it is useful to configure the focus observable to always notify subscribers, even if its value doesn't change, using `focus.extend({notify: "always"})`.
* activate, function: Optional callback function that will be invoked if the user presses the "enter" key while using the login controls.

See Also
--------

- :ref:`slycat-login-controls` - if you don't need to prompt users for a hostname.
- :ref:`slycat-remotes` - for a higher-level API that provides a modal login dialog, and can manage a pool of remote connections.

