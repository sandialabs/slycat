DELETE Upload
=============

.. http:delete:: /uploads/(uid)

    Delete an upload session used to upload files for storage as model artifacts.
    This function must be called once the client no longer needs the session, whether
    the upload(s) have been completed successfully or the client is cancelling an
    incomplete session.

    :param uid: Unique upload session identifier.
    :type uid: string

    :status 204: The upload session and any temporary storage have been deleted.
    :status 409: The upload session cannot be deleted, because parsing is in progress.  Try again later.

See Also
--------

* :http:post:`/uploads/(uid)/finished`

