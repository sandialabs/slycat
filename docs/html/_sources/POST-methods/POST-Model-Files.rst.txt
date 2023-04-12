POST Model Files
================

.. http:post:: /api/models/(mid)/files

  Upload files for addition to a model, either from the client to the server or
  a remote host to the server using a remote session. To upload files from the
  client, specify the "files" parameter with one or more files. To upload
  remote files, specify the "sids" and "paths" parameters with a session id and
  remote filepath for each file to upload. In either case specify the
  boolean "input" parameter, the name of a parsing plugin in "parser", and one
  or more artifact ids using "aids".  Any additional parameters will be passed
  to the parsing plugin.

  The set of parsing plugins will vary based on server configuration, and
  parsing plugins have wide latitude in how they map parsed file data to model
  artifacts.  For example, the `slycat-blob-parser` plugin will store :math:`N`
  files as unparsed model file artifacts, and thus requires :math:`N`
  corresponding artifact ids to use for storage.  Similarly, the
  `slycat-csv-parser` plugin stores :math:`N` parsed files as arrayset
  artifacts, and also requires :math:`N` artifact ids.  However, more
  sophisticated parsing plugins could split one file into multiple artifacts,
  combine multiple files into one artifact, or store any other combination of
  :math:`M` files into :math:`N` artifacts.

  :param mid: Unique model identifier.
  :type mid: string

  :requestheader Content-Type: form/multipart

  :form aids: Artifact ids for storage.
  :form files: Local files for upload.
  :form input: Set to "true" to store results as input artifacts.
  :form parser: Parsing plugin name.
  :form paths: Remote host absolute filesystem paths.
  :form sids: Remote session ids.

See Also
--------

-  :http:post:`/api/remotes/(hostname)/browse(path)`

