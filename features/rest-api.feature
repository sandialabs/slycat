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

  Scenario Outline: DELETE Reference
    Given a running Slycat server.
    And a default project.
    And a generic model.
    And a sample bookmark.
    And a saved bookmark.
    Then <scenario>.
    And <result>.

    Examples:
      | scenario                                               | result                              |
      | server administrators can delete the saved bookmark    | the saved bookmark no longer exists |
      | project administrators can delete the saved bookmark   | the saved bookmark no longer exists |
      | project writers can delete the saved bookmark          | the saved bookmark no longer exists |
      | project readers cannot delete the saved bookmark       | the saved bookmark still exists     |
      | project outsiders cannot delete the saved bookmark     | the saved bookmark still exists     |
      | unauthenticated users cannot delete the saved bookmark | the saved bookmark still exists     |

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

  Scenario: GET Model File
    Given a running Slycat server.
    And a default project.
    And a generic model.
    And the model has a file artifact.
    Then server administrators can retrieve the model file artifact.
    And project administrators can retrieve the model file artifact.
    And project writers can retrieve the model file artifact.
    And project readers can retrieve the model file artifact.
    And project outsiders cannot retrieve the model file artifact.
    And unauthenticated clients cannot retrieve the model file artifact.

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
    And the model has a parameter artifact.
    Then server administrators can retrieve the model parameter artifact.
    And project administrators can retrieve the model parameter artifact.
    And project writers can retrieve the model parameter artifact.
    And project readers can retrieve the model parameter artifact.
    And project outsiders cannot retrieve the model parameter artifact.
    And unauthenticated clients cannot retrieve the model parameter artifact.

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
    Then server administrators can retrieve the list of project models.
    And project administrators can retrieve the list of project models.
    And project writers can retrieve the list of project models.
    And project readers can retrieve the list of project models.
    And project outsiders cannot retrieve the list of project models.
    And unauthenticated clients cannot retrieve the list of project models.

  Scenario: GET Project References
    Given a running Slycat server.
    And a default project.
    And a generic model.
    And a sample bookmark.
    And a saved bookmark.
    Then server administrators can retrieve the list of project references.
    And project administrators can retrieve the list of project references.
    And project writers can retrieve the list of project references.
    And project readers can retrieve the list of project references.
    And project outsiders cannot retrieve the list of project references.
    And unauthenticated clients cannot retrieve the list of project references.

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
    Then any authenticated user can retrieve information about themselves.

  Scenario: GET User
    Given a running Slycat server.
    Then any authenticated user can retrieve information about another user.

  Scenario: POST Events
    Given a running Slycat server.
    Then authenticated users can log events.
    And unauthenticated users cannot log events.

  Scenario Outline: POST Model Files
    Given a running Slycat server.
    And a default project.
    And a generic model.
    Then <scenario>.
    And <result>.

    Examples:
      | scenario                                   | result |
      | server administrators can upload a file    | the model will contain a new file artifact |
      | project administrators can upload a file   | the model will contain a new file artifact |
      | project writers can upload a file          | the model will contain a new file artifact |
      | project readers cannot upload a file       | the model will not contain a new file artifact |
      | project outsiders cannot upload a file     | the model will not contain a new file artifact |
      | unauthenticated users cannot upload a file | the model will not contain a new file artifact |

  Scenario Outline: POST Model Finish
    Given a running Slycat server.
    And a default project.
    And a generic model.
    Then <scenario>.
    And <result>.

    Examples:
      | scenario                                         | result |
      | server administrators can finish the model       | the model will be finished |
      | project administrators can finish the model      | the model will be finished |
      | project writers can finish the model             | the model will be finished |
      | project readers cannot finish the model          | the model will remain unfinished |
      | project outsiders cannot finish the model        | the model will remain unfinished |
      | unauthenticated users cannot finish the model    | the model will remain unfinished |

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

  Scenario Outline: POST Project References
    Given a running Slycat server.
    And a default project.
    And a generic model.
    And a sample bookmark.
    Then <scenario>.

    Examples: Saved Bookmarks
      | scenario                                                |
      | server administrators can create a saved bookmark       |
      | project administrators can create a saved bookmark      |
      | project writers can create a saved bookmark             |
      | project readers cannot create a saved bookmark          |
      | project outsiders cannot create a saved bookmark        |
      | unauthenticated users cannot create a saved bookmark    |

    Examples: Bookmark Templates
      | scenario                                                |
      | server administrators can create a bookmark template    |
      | project administrators can create a bookmark template   |
      | project writers can create a bookmark template          |
      | project readers cannot create a bookmark template       |
      | project outsiders cannot create a bookmark template     |
      | unauthenticated users cannot create a bookmark template |

  Scenario Outline: POST Project Models
    Given a running Slycat server.
    And a default project.
    Then <scenario>.
    And <result>.

    Examples:
      | scenario                                        | result                                  |
      | server administrators can create a new model    | the project contains a new model        |
      | project administrators can create a new model   | the project contains a new model        |
      | project writers can create a new model          | the project contains a new model        |
      | project readers cannot create a new model       | the project doesn't contain a new model |
      | project outsiders cannot create a new model     | the project doesn't contain a new model |
      | unauthenticated users cannot create a new model | the project doesn't contain a new model |

  Scenario: POST Projects
    Given a running Slycat server.
    Then any authenticated user can create a new project.
    And unauthenticated users cannot create a new project.

#  Scenario: POST Remotes
#    Given a running Slycat server.
#    When a client creates a new remote session.
#    Then the remote session should be created.

  Scenario Outline: PUT Model Arrayset
    Given a running Slycat server.
    And a default project.
    And a generic model.
    Then <scenario>.
    And <result>.

    Examples:
      | scenario                                                         | result                                         |
      | server administrators can add arrayset artifacts to the model    | the model contains an empty arrayset artifact  |
      | project administrators can add arrayset artifacts to the model   | the model contains an empty arrayset artifact  |
      | project writers can add arrayset artifacts to the model          | the model contains an empty arrayset artifact  |
      | project readers cannot add arrayset artifacts to the model       | the model doesn't contain an arrayset artifact |
      | project outsiders cannot add arrayset artifacts to the model     | the model doesn't contain an arrayset artifact |
      | unauthenticated users cannot add arrayset artifacts to the model | the model doesn't contain an arrayset artifact |

  Scenario Outline: PUT Model Arrayset Array
    Given a running Slycat server.
    And a default project.
    And a generic model.
    And the model has an arrayset artifact.
    Then <scenario>.
    And <result>.

    Examples:
      | scenario                                                      | result                                            |
      | server administrators can add arrays to arrayset artifacts    | the arrayset artifact contains a new array        |
      | project administrators can add arrays to arrayset artifacts   | the arrayset artifact contains a new array        |
      | project writers can add arrays to arrayset artifacts          | the arrayset artifact contains a new array        |
      | project readers cannot add arrays to arrayset artifacts       | the arrayset artifact doesn't contain a new array |
      | project outsiders cannot add arrays to arrayset artifacts     | the arrayset artifact doesn't contain a new array |
      | unauthenticated users cannot add arrays to arrayset artifacts | the arrayset artifact doesn't contain a new array |

  Scenario Outline: PUT Model Inputs
    Given a running Slycat server.
    And a default project.
    And a generic model.
    And the model has a parameter artifact.
    And the model has an arrayset artifact.
    And the model has a file artifact.
    And a second generic model.
    Then <scenario>.
    And <result>.

    Examples:
      | scenario                                                        | result                                         |
      | server administrators can copy artifacts to the second model    | the model contains the copied artifacts        |
      | project administrators can copy artifacts to the second model   | the model contains the copied artifacts        |
      | project writers can copy artifacts to the second model          | the model contains the copied artifacts        |
      | project readers cannot copy artifacts to the second model       | the model doesn't contain the copied artifacts |
      | project outsiders cannot copy artifacts to the second model     | the model doesn't contain the copied artifacts |
      | unauthenticated users cannot copy artifacts to the second model | the model doesn't contain the copied artifacts |

  Scenario Outline: PUT Model
    Given a running Slycat server.
    And a default project.
    And a generic model.
    Then <scenario>.
    And <result>.

    Examples:
      | scenario                                      | result                 |
      | server administrators can modify the model    | the model is changed   |
      | project administrators can modify the model   | the model is changed   |
      | project writers can modify the model          | the model is changed   |
      | project readers cannot modify the model       | the model is unchanged |
      | project outsiders cannot modify the model     | the model is unchanged |
      | unauthenticated users cannot modify the model | the model is unchanged |


  Scenario Outline: PUT Model Parameter
    Given a running Slycat server.
    And a default project.
    And a generic model.
    Then <scenario>.

    Examples:
      | scenario                                             |
      | server administrators can store a model parameter    |
      | project administrators can store a model parameter   |
      | project writers can store a model parameter          |
      | project readers cannot store a model parameter       |
      | project outsiders cannot store a model parameter     |
      | unauthenticated users cannot store a model parameter |

  Scenario Outline: PUT Project
    Given a running Slycat server.
    And a default project.
    Then <scenario>.

    Examples:
    | scenario                                                                    |
    | server administrators can modify the project acl, name, and description     |
    | project administrators can modify the project acl, name, and description    |
    | project writers can modify the project name and description only            |
    | project readers cannot modify the project                                   |
    | project outsiders cannot modify the project                                 |
    | unauthenticated users cannot modify the project                             |

