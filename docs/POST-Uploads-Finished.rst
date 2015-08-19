POST Uploads Finished
=====================

.. http:post:: /uploads/(uid)/finished

    Notify the server that all files have been uploaded for the given upload
    session, and processing can begin.  The request must include the `finished`
    parameter, which specifies the number of files that were uploaded, and the
    number of parts in each file.  This allows the server a chance to validate
    that it has received every part of every file.

    :requestheader Content-Type: application/json

    :<json array uploaded: array containing the number of parts :math:`M` for every uploaded file :math:`N`.

    :status 202: The server has validated all of the uploaded data, and will begin the parsing process.
    :status 400: The server did not receive all of the file parts enumerated in the request.  Parsing will not begin until the missing parts have been uploaded and :http:post:`/uploads/(uid)` is called again.

    :responseheader Content-Type: application/json

    :>json array missing: array containing a [fid, pid] tuple for every file part that wasn't uploaded successfully.

See Also
--------

-  :http:put:`/uploads/(uid)/files/(fid)/parts/(pid)`
-  :http:delete:`/uploads/(uid)`

