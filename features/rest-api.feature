Feature: REST API
  Scenario Outline: DELETE Model
    Given a running Slycat server.
    And a default project.
    And a generic model.
    Then <scenario>.
    And <result>.

    Examples:
      | scenario                                      | result                     |
      | server administrators can delete the model    | the model no longer exists |
      | project administrators can delete the model   | the model no longer exists |
      | project writers can delete the model          | the model no longer exists |
      | project readers cannot delete the model       | the model still exists     |
      | project outsiders cannot delete the model     | the model still exists     |
      | unauthenticated users cannot delete the model | the model still exists     |

  Scenario Outline: DELETE Project
    Given a running Slycat server.
    And a default project.
    Then <scenario>.
    And <result>.

    Examples:
      | scenario                                        | result                       |
      | server administrators can delete the project    | the project no longer exists |
      | project administrators can delete the project   | the project no longer exists |
      | project writers cannot delete the project       | the project still exists     |
      | project readers cannot delete the project       | the project still exists     |
      | project outsiders cannot delete the project     | the project still exists     |
      | unauthenticated users cannot delete the project | the project still exists     |

  Scenario: DELETE Reference
    Given a running Slycat server.
    And a default project.
    And a generic model.
    And a sample bookmark.
    And a saved bookmark.
    When a client deletes the saved bookmark.
    Then the saved bookmark should no longer exist.

#  Scenario: DELETE Remote
#    Given a running Slycat server.
#    And a remote session.
#    When a client deletes the remote session.
#    Then the remote session should no longer exist.

  Scenario: GET Bookmark
    Given a running Slycat server.
    And a default project.
    And a sample bookmark.
    Then server administrators can retrieve a bookmark.
    And project administrators can retrieve a bookmark.
    And project writers can retrieve a bookmark.
    And project readers can retrieve a bookmark.
    And project outsiders cannot retrieve a bookmark.
    And unauthenticated users cannot retrieve a bookmark.

  Scenario: GET Configuration Markings
    Given a running Slycat server.
    Then Any authenticated user can request the set of available markings.

  Scenario: GET Configuration Parsers
    Given a running Slycat server.
    Then Any authenticated user can request the set of available parsers.

  Scenario: GET Configuration Remote Hosts
    Given a running Slycat server.
    Then Any authenticated user can request the set of remote hosts.

  Scenario: GET Configuration Support Email
    Given a running Slycat server.
    Then Any authenticated user can request the support email.

  Scenario: GET Configuration Version
    Given a running Slycat server.
    Then Any authenticated user can request the server version.

  Scenario: GET Configuration Wizard
    Given a running Slycat server.
    Then Any authenticated user can request the set of available wizards.

  Scenario: GET Global Resource
    Given a running Slycat server.
    Then any authenticated user can request a global resource.

  Scenario: GET Model
    Given a running Slycat server.
    And a default project.
    And a generic model.
    Then server administrators can retrieve the model.
    And project administrators can retrieve the model.
    And project writers can retrieve the model.
    And project readers can retrieve the model.
    And project outsiders cannot retrieve the model.
    And unauthenticated clients cannot retrieve the model.

  Scenario: GET Model Parameter
    Given a running Slycat server.
    And a default project.
    And a generic model.
    When a client stores a model parameter artifact.
    Then the client can retrieve the model parameter artifact.

  Scenario: GET Model Resource
    Given a running Slycat server.
    Then any authenticated user can request a model resource.

  Scenario: GET Wizard Resource
    Given a running Slycat server.
    Then any authenticated user can request a wizard resource.

  Scenario: GET Project Models
    Given a running Slycat server.
    And a default project.
    And a generic model.
    And a second generic model.
    When a client retrieves the project models.
    Then the server should return the project models.

  Scenario: GET Project References
    Given a running Slycat server.
    And a default project.
    And a generic model.
    And a sample bookmark.
    And a saved bookmark.
    And a saved template.
    When a client retrieves the project references.
    Then the server should return the project references.

  Scenario: GET Project
    Given a running Slycat server.
    And a default project.
    Then server administrators can retrieve the project.
    And project administrators can retrieve the project.
    And project writers can retrieve the project.
    And project readers can retrieve the project.
    And project outsiders cannot retrieve the project.
    And unauthenticated clients cannot retrieve the project.

  Scenario: GET Projects
    Given a running Slycat server.
    And a project with one writer and one reader.
    And a project with one writer and no readers.
    And a project without any writers or readers.
    Then server administrators can retrieve a list with all three projects.
    And project administrators can retrieve a list with all three projects.
    And project writers can retrieve a list with two projects.
    And project readers can retrieve a list with one project.
    And project outsiders can retrieve a list containing none of the projects.
    And unauthenticated clients cannot retrieve the list of projects.

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
    Then server administrators can save a bookmark.
    And project administrators can save a bookmark.
    And project writers can save a bookmark.
    # Note that project readers *can* save bookmarks ... this is intentional!
    And project readers can save a bookmark.
    And project outsiders cannot save a bookmark.
    And unauthenticated users cannot save a bookmark.

  Scenario: POST Project References (Saved Bookmark)
    Given a running Slycat server.
    And a default project.
    And a generic model.
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

#  Scenario: POST Remotes
#    Given a running Slycat server.
#    When a client creates a new remote session.
#    Then the remote session should be created.

  Scenario: PUT Model Arrayset
    Given a running Slycat server.
    And a default project.
    And a generic model.
    When a client adds a new arrayset to the model.
    Then the model should contain the new arrayset.
    And the new arrayset should be empty.

  Scenario: PUT Model Arrayset Array
    Given a running Slycat server.
    And a default project.
    And a generic model.
    And the model has an arrayset.
    When the client adds an array to the arrayset.
    Then the arrayset should contain the new array.

  Scenario: PUT Model Inputs
    Given a running Slycat server.
    And a default project.
    And a generic model.
    And the model has a parameter.
    And the model has an arrayset.
    And the model has a file.
    And a second generic model.
    When the client copies the artifacts to the second model.
    Then the model should contain the same set of artifacts.

  Scenario: PUT Model
    Given a running Slycat server.
    And a default project.
    And a generic model.
    When a client modifies the model.
    Then the model should be modified.

  Scenario: PUT Model Parameter
    Given a running Slycat server.
    And a default project.
    And a generic model.
    When a client stores a model parameter artifact.
    Then the client can retrieve the model parameter artifact.

  Scenario: PUT Project
    Given a running Slycat server.
    And a default project.
    When a client modifies the project.
    Then the project should be modified.

