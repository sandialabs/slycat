PUT Upload File Part
====================

.. http:put:: /uploads/(uid)/files/(fid)/parts/(pid)

    Upload a file (or part of a file) as part of an upload session created with
    :http:post:`/uploads`.

    Use the "pid" and "fid" parameters to specify that the data being uploaded
    is for part :math:`M` of file :math:`N`.  To upload a file from the client,
    specify the "file" parameter.  To upload a remote file, specify the "sid"
    and "path" parameters with a session id and remote filepath for the file to
    upload.

    :param uid: Unique upload session identifier.
    :type uid: string
    :param fid: Zero-based file index of the data to be uploaded.
    :type fid: integer
    :param pid: Zero-based part index of the data to be uploaded.
    :type pid: integer

    :requestheader Content-Type: form/multipart

    :form file: Local file for upload.
    :form path: Remote host absolute filesystem path.
    :form sid: Remote session id.

    :status 200: The data was uploaded successfully.

See Also
--------

* :http:post:`/uploads`
* :http:post:`/uploads/(uid)/finished`

