Feature: REST API

  Scenario: DELETE Project
    Given a running Slycat server.
    And a default project.
    When a client deletes the project.
    Then the project should no longer exist.

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

  Scenario: GET Project
    Given a running Slycat server.
    And a default project.
    When a client retrieves the project.
    Then the server should return the project.

  Scenario: GET Projects
    Given a running Slycat server.
    And a default project.
    And another default project.
    When a client retrieves all projects.
    Then the server should return all projects.

  Scenario: GET User (Current)
    Given a running Slycat server.
    When a client requests information about the current user.
    Then the server should return information about the current user.
  Scenario: GET User
    Given a running Slycat server.
    When a client requests information about another user.
    Then the server should return information about the other user.

  Scenario: POST Projects
    Given a running Slycat server.
    When a client creates a new project.
    Then the project should be created.

  Scenario: PUT Project
    Given a running Slycat server.
    And a default project.
    When a client modifies the project.
    Then the project should be modified.

