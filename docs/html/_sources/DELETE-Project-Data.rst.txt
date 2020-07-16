DELETE Project Data
===========================

.. http:delete:: /api/projects/data/(did)

  Deletes a project data. project data is data in 
  the raw that was captured well uploading to a model
  and is in the original state it was uploaded as so that
  it can be used to create new models right off the server 
  without uploading it again.

  :param did: Unique data identifier.
  :type did: string

  :status 204: Project Data deleted.

  **Sample Request**

  .. sourcecode:: http

    DELETE /api/model/dbaf026f919620acbf2e961ad732433d/projects/data/93af026f919620acbf2e961ad732433d HTTP/1.1
    Host: localhost:8093
    Content-Length: 0
    Authorization: Basic c2x5Y2F0OnNseWNhdA==
    Accept: */*
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.80 Safari/537.36

  **Sample Response**

  .. sourcecode:: http

    HTTP/1.1 204 Project Data deleted.
    Date: Mon, 25 Nov 2018 20:35:59 GMT
    Content-Type: text/html;charset=utf-8
    Server: CherryPy/14.0.0

See Also
--------

- :http:get:`/api/projects`
