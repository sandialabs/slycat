.. _POST Agent Browse:

POST Agent Browse
=================
Description
-----------

Uses an existing agent session to retrieve remote filesystem information.  The
session must have been created successfully using :ref:`POST Agents`.  The
caller *must* supply the session id, and the path on the remote filesystem to
retrieve.  The caller *may* supply additional parameters to filter directories
and files in the results, based on regular expressions.

If the session doesn't exist or has timed-out, the server returns `404`.  If some
other error prevents the data from being returned, the server returns `400`.

Requests
--------

Syntax
^^^^^^

::

    POST /agents/(session)/browse(path)

Accepts
^^^^^^^

application/json

Parameters
^^^^^^^^^^

* directory-reject - optional regular expression for filtering directories.
* directory-allow - optional regular expression for retaining directories.
* file-reject - optional regular expression for filtering files.
* file-allow - optional regular expression for allowing files.

The regular expression parameters are matched against full file / directory
paths.  If a file / directory matches a reject expression, it will not be
included in the results, unless it also matches an allow expression.  So, to
remove JPEG files from the results::

  file-reject = [.]jpg$|[.]jpeg$  # Reject files that end in .jpg or .jpeg

but to only return CSV files::

  file-reject = .*       # Reject all files
  file-allow = [.]csv$   # ... except for files that end in .csv

Responses
---------

Returns
^^^^^^^

application/json

Examples
--------

Sample Request
^^^^^^^^^^^^^^

::

  POST /agents/505d0e463d5ed4a32bb6b0fe9a000d36/browse/home/fred

  {
    file-reject: "[.]jpg$"
  }

Sample Response
^^^^^^^^^^^^^^^

::

  {
    "path" : "/home/fred",
    "names" : ["a.txt", "b.png", "c.csv", "subdir"],
    "sizes" : [1264, 456730, 78005, 4096],
    "types' : ["f", "f", "f", "d"]
  }

See Also
--------

* :ref:`POST Agents`
* :ref:`GET Agent File`
* :ref:`GET Agent Image`

