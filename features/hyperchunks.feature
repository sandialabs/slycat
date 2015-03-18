Feature: Slycat Agent

  Scenario: Create a default Hyperchunks object.
    When a Hyperchunks object is created without parameters.
    Then the Hyperchunks object should be empty.

  Scenario: Create a default Hyperchunk object.
    When a Hyperchunk object is created without parameters.
    Then the Hyperchunk object should select all arrays and all attributes.

  Scenario: Create a default Hyperslices object.
    When a Hyperslices object is created without parameters.
    Then the Hyperslices object should be empty.

  Scenario: Create an empty Hyperslice object.
    When a Hyperslice object is created without parameters, an exception should be raised.

