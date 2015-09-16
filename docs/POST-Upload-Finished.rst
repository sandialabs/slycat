POST Upload Finished
====================

.. http:post:: /uploads/(uid)/finished

    Notify the server that all files have been uploaded for the given upload
    session, and processing can begin.  The request must include the `uploaded`
    parameter, which specifies the number of files that were uploaded, and the
    number of parts in each file.  The server uses this information to validate
    that it received every part of every file that the client sent.

    :param uid: Unique upload session identifier.
    :type uid: string

    :requestheader Content-Type: application/json

    :<json array uploaded: array containing the number of parts :math:`M` for every uploaded file :math:`N`.

    :status 202: The server has validated all of the uploaded data, and will begin the parsing process.
    :status 400: "Upload incomplete" The server did not receive all of the file parts specified in the `uploaded` parameter.  Parsing will not begin until the missing parts have been uploaded and :http:post:`/uploads/(uid)/finished` is called again.
    :status 400: "Client confused" The server received more file parts than those specified in the `uploaded` parameter.  Parsing will not begin unless :http:post:`/uploads/(uid)/finished` is called again with the correct part counts in `uploaded`.

    :responseheader Content-Type: application/json

    :>json array missing: array containing a [fid, pid] tuple for every file part that wasn't uploaded successfully.

See Also
--------

-  :http:put:`/uploads/(uid)/files/(fid)/parts/(pid)`
-  :http:delete:`/uploads/(uid)`

