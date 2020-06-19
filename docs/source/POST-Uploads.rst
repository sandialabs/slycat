POST Uploads
============

.. http:post:: /api/uploads

    Create an upload session used to upload files for storage as model
    artifacts. Once an upload session has been created, use
    :http:put:`/uploads/(uid)/files/(fid)/parts/(pid)` to upload files directly from the client to the
    server or from a remote host to the server using a remote session.

    In either case this call must include the id of the model to receive new
    artifacts, a boolean “input” parameter to specify whether the created
    artifacts are input artifacts, the name of a parsing plugin in “parser”,
    and one or more artifact ids using “aids”. Any additional parameters will
    be passed unchanged to the parsing plugin for use as plugin-specific
    parsing parameters.

    The set of parsing plugins will vary based on server configuration, and
    parsing plugins have wide latitude in how they map parsed file data to
    model artifacts. For example, the slycat-blob-parser plugin will store :math:`N`
    files as unparsed model file artifacts, and thus requires :math:`N` corresponding
    artifact ids to use for storage. Similarly, the slycat-csv-parser plugin
    stores :math:`N` parsed files as arrayset artifacts, and also requires :math:`N` artifact
    ids. However, more sophisticated parsing plugins could split one file into
    multiple artifacts, combine multiple files into one artifact, or store any
    other combination of :math:`M` files into :math:`N` artifacts.

    :requestheader Content-Type: application/json

    :<json string mid: Unique model identifier.
    :<json string input: Set to “true” to store results as input artifacts.
    :<json string parser: Parsing plugin name.
    :<json array aids: Artifact ids for storage.

    :status 200: The new upload session was created, and the response contains the new session id.
    :status 400: An upload session couldn't be created due to invalid parameters (e.g: unknown model, unknown parser, invalid parser parameters).
    :status 403: Client doesn’t have write access to the given model

    :responseheader Content-Type: application/json

    :>json string id: New upload session id.

See Also
--------
* :http:put:`/api/uploads/(uid)/files/(fid)/parts/(pid)`

