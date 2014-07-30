.. _POST Events:

POST Events
===========
Description
-----------

Insert a client-side event into the server log. Clients should use this
API to record any user interaction events that may be of later interest
for subsequent analytics. The structure of the request URI following the
initial "/events/" is left to the client. Note that the request body is
ignored. Sample requests describing user interaction with a particular
model:

Requests
--------

Syntax
^^^^^^

::

    POST /events/(event)

Examples
--------

Sample Requests
^^^^^^^^^^^^^^^

::

    POST /events/models/0bfb94cba9654faf904b6fe8b2aab603/select/component/3
    POST /events/models/0bfb94cba9654faf904b6fe8b2aab603/select/variable/1
    POST /events/models/0bfb94cba9654faf904b6fe8b2aab603/sort/variable/2
    POST /events/models/0bfb94cba9654faf904b6fe8b2aab603/pan?dx=34&dy=2
    POST /events/models/0bfb94cba9654faf904b6fe8b2aab603/zoom?factor=2.3

