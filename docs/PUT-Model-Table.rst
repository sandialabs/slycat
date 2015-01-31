PUT Model Table
===============

.. http:put:: /models/(mid)/tables/(name)

  Upload a table, either from the client to the model or a remote host to
  the model over SSH. To upload a file from the client, specify a single
  parameter "file" with the file contents. To upload a remote file,
  specify parameters "username", "hostname", "password", and "path". For
  both cases specify an additional boolean parameter "input".

  :param mid: Unique model identifier.
  :type mid: string

  :param name: Unique table name.
  :type name: string

  :requestheader Content-Type: form/multipart

  :form file: Used to upload a file from the client.
  :form hostname: Remote host.
  :form username: Remote host username.
  :form password: Remote host password.
  :form path: Remote host absolute filesystem path.

See Also
--------

-  :http:post:`/remotes/(sid)/browse(path)`

