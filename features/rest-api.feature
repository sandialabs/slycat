Feature: REST API
  Scenario: GET Configuration Version
    Given a running Slycat server.
    When a client requests the server version.
    Then the server should return its version.
