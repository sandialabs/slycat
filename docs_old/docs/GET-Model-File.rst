GET Model File
==============

.. http:get:: /models/(mid)/files/(aid)

  Retrieves a file artifact from a model. File artifacts are effectively
  binary blobs that may contain arbitrary data with an explicit content
  type.

  :param mid: Unique model identifier.
  :type mid: string

  :param aid: File artifact id.
  :type aid: string

  :responseheader Content-Type: The content type of the file artifact, which could be anything.
