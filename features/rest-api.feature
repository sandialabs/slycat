Feature: REST API
  Scenario: GET Configuration Markings
    Given a running Slycat server.
    When a client requests the set of available markings.
    Then the server should return a list of markings.
  Scenario: GET Configuration Parsers
    Given a running Slycat server.
    When a client requests the set of available parsers.
    Then the server should return a list of parsers.
  Scenario: GET Configuration Remote Hosts
    Given a running Slycat server.
    When a client requests the set of configured remote hosts.
    Then the server should return a list of remote hosts.
  Scenario: GET Configuration Support Email
    Given a running Slycat server.
    When a client requests the server support email.
    Then the server should return its support email.
  Scenario: GET Configuration Version
    Given a running Slycat server.
    When a client requests the server version.
    Then the server should return its version.
  Scenario: GET Configuration Wizard
    Given a running Slycat server.
    When a client requests available server wizards.
    Then the server should return a list of available wizards.
