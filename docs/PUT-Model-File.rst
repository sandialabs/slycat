PUT Model File
==============

.. http:put:: /models/(mid)/files/(name)

  Upload a file artifact (opaque blob with content type), from the client
  to the model.

  :param mid: Unique model identifier.
  :type mid: string

  :param name: Unique file name.
  :type name: string

  :requestheader Content-Type: form/multipart

  :form file: The file contents.

  :form input: Set to true if the file is a model input.

See Also
--------

-  :http:put:`/models/(mid)/tables/(name)`

