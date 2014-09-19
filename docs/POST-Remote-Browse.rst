.. _POST Remote Browse:

POST Remote Browse
==================
Description
-----------

Uses an existing session to retrieve remote filesystem information.  The
session must have been created successfully using :ref:`POST Remote`.  The caller
*must* supply the session id, and the path on the remote filesystem to retrieve.
The caller *may* supply additional parameters to filter directories and files in
the results, based on regular expressions.

If the session doesn't exist or has timed-out, the server returns `404`.  If some
other error prevents the data from being returned, the server returns `400`.

Requests
--------

Syntax
^^^^^^

::

    POST /remote/browse

Accepts
^^^^^^^

application/json

Parameters
^^^^^^^^^^

* sid - remote session identifier, required.
* path - remote filesystem path, required.
* directory-reject - regular expression for directories that should be removed from the results. Optional.
* directory-allow - regular expression for directories that should be included in the results. Optional.
* file-reject - regular expression for files that should be removed from the results. Optional.
* file-allow - regular expression for files that should be included in the results. Optional.

The regular expression parameters are matched against full file / directory
paths.  If a file / directory matches a reject expression, it will not be
included in the results, unless it also matches an allow expression.  For example,
to only return CSV files, specify::

  file-reject = .*       # Matches all files
  file-allow = [.]csv$   # Matches files that end with .csv

Or to remove JPEG files from results::

  file-reject = [.]jpg$

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

  POST /remote/browse

  {
    sid: "505d0e463d5ed4a32bb6b0fe9a000d36",
    path: "/home/fred"
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

* :ref:`POST Remote`
* :ref:`GET Remote File`

