POST Model Files
================

.. http:post /models/(mid)/files

  Upload files for addition to a model, either from the client to the server or
  a remote host to the server using a remote session. To upload files from the
  client, specify the "files" parameter with one or more files. To upload
  remote files, specify the "sids" and "paths" parameters with a session id and
  remote filepath for each file to upload. In either case specify the
  boolean "input" parameter, the name of a parsing plugin in "parser", and one
  or more artifact names using "names".  Additional parameters will be passed
  to the parsing plugin.

  :param mid: Unique model identifier.
  :type mid: string

  :requestheader Content-Type: form/multipart

  :form files: Local files for upload.
  :form input: Set to "true" to store results as input artifacts.
  :form names: Artifact names for storage.
  :form parser: Parsing plugin name.
  :form paths: Remote host absolute filesystem paths.
  :form sids: Remote session ids.


See Also
--------

-  :http:post:`/remotes/(sid)/browse(path)`

