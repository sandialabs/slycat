Feature: Slycat Agent

  Scenario: Create an empty Hyperchunks object.
    When creating an empty Hyperchunks object.
    Then the result should be an empty Hyperchunks object.

  Scenario: Create an empty Hyperchunk object.
    When creating an empty Hyperchunk object.
    Then the result should be an empty Hyperchunk object.

  Scenario: Create an empty Hyperslices object.
    When creating an empty Hyperslices object.
    Then the result should be an empty Hyperslices object.

  Scenario: Create an empty Hyperslice object.
    When creating an empty Hyperslice object, an exception should be raised.

