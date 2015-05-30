Feature: REST API

  Scenario: DELETE Model
    Given a running Slycat server.
    And a default project.
    And a default model.
    When a client deletes the model.
    Then the model should no longer exist.

  Scenario: DELETE Project
    Given a running Slycat server.
    And a default project.
    When a client deletes the project.
    Then the project should no longer exist.

  Scenario: GET Bookmark
    Given a running Slycat server.
    And a default project.
    And a sample bookmark.
    When a client retrieves the project bookmark.
    Then the project bookmark should be retrieved.

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

  Scenario: GET Model
    Given a running Slycat server.
    And a default project.
    And a default model.
    When a client retrieves the model.
    Then the server should return the model.

  Scenario: GET Model Parameter
    Given a running Slycat server.
    And a default project.
    And a default model.
    When a client stores a model parameter artifact.
    Then the client can retrieve the model parameter artifact.

  Scenario: GET Project Models
    Given a running Slycat server.
    And a default project.
    And a default model.
    And a second default model.
    When a client retrieves the project models.
    Then the server should return the project models.

  Scenario: GET Project References
    Given a running Slycat server.
    And a default project.
    And a default model.
    And a sample bookmark.
    And a saved bookmark.
    And a saved template.
    When a client retrieves the project references.
    Then the server should return the project references.

  Scenario: GET Project
    Given a running Slycat server.
    And a default project.
    When a client retrieves the project.
    Then the server should return the project.

  Scenario: GET Projects
    Given a running Slycat server.
    And a default project.
    And a second default project.
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

  Scenario: POST Project Bookmarks
    Given a running Slycat server.
    And a default project.
    When a client saves a project bookmark.
    Then the project bookmark should be saved.

  Scenario: POST Project References (Saved Bookmark)
    Given a running Slycat server.
    And a default project.
    And a default model.
    And a sample bookmark.
    When a client creates a saved bookmark.
    Then the saved bookmark should be created.

  Scenario: POST Project References (Template)
    Given a running Slycat server.
    And a default project.
    And a sample bookmark.
    When a client creates a template.
    Then the template should be created.

  Scenario: POST Project Models
    Given a running Slycat server.
    And a default project.
    When a client creates a new model.
    Then the model should be created.

  Scenario: POST Projects
    Given a running Slycat server.
    When a client creates a new project.
    Then the project should be created.

  Scenario: PUT Model
    Given a running Slycat server.
    And a default project.
    And a default model.
    When a client modifies the model.
    Then the model should be modified.

  Scenario: PUT Model Parameter
    Given a running Slycat server.
    And a default project.
    And a default model.
    When a client stores a model parameter artifact.
    Then the client can retrieve the model parameter artifact.

  Scenario: PUT Project
    Given a running Slycat server.
    And a default project.
    When a client modifies the project.
    Then the project should be modified.

