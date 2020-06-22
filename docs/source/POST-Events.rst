POST Events
===========

.. http:post:: /api/events/(event)

  Insert a client-side event into the server log. Clients should use this
  API to record any user interaction events that may be of later interest
  for subsequent analytics. The structure of the request URI following the
  initial "/events/" is left to the client. Note that the request body is
  ignored.

  :param event: Path-like user interaction to be logged.
  :type event: string

  **Sample Requests**

  The following is a hypothetical stream of events logged as a user interacts
  with a model.  The structure and meaning of the events are completely
  client-driven.

  .. sourcecode:: http

    POST /api/events/models/0bfb94cba9654faf904b6fe8b2aab603/select/component/3 HTTP/1.1

  .. sourcecode:: http

    POST /api/events/models/0bfb94cba9654faf904b6fe8b2aab603/select/variable/1 HTTP/1.1

  .. sourcecode:: http

    POST /api/events/models/0bfb94cba9654faf904b6fe8b2aab603/sort/variable/2 HTTP/1.1

  .. sourcecode:: http

    POST /api/events/models/0bfb94cba9654faf904b6fe8b2aab603/pan?dx=34&dy=2 HTTP/1.1

  .. sourcecode:: http

    POST /api/events/models/0bfb94cba9654faf904b6fe8b2aab603/zoom?factor=2.3 HTTP/1.1

