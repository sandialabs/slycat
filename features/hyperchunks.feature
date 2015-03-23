Feature: Slycat Agent

  Scenario: Create a default Hyperchunks object.
    When a Hyperchunks object is created without parameters.
    Then the Hyperchunks object should be empty.

  Scenario: Create an empty Hyperchunk object.
    When a Hyperchunk object is created without parameters, an exception must be raised.

  Scenario Outline: Create a Hyperchunk object. 
    When creating a Hyperchunk with <input>
    Then the Hyperchunk should contain <input>

    Examples:
      | input                                     |
      | one array                                 |
      | an array range                            |
      | all arrays                                |
      | one array and one attribute               |
      | one array and a range of attributes       |
      | one array and all attributes              |

  Scenario: Create a default Hyperslices object.
    When a Hyperslices object is created without parameters.
    Then the Hyperslices object should be empty.

  Scenario: Create an empty Hyperslice object.
    When a Hyperslice object is created without parameters, an exception must be raised.

  Scenario Outline: Create a Hyperslice object. 
    When creating a Hyperslice with <input>
    Then the Hyperslice should contain <input>

    Examples:
      | input                                     |
      | one index                                 |
      | a half-open range [...) of indices        |
      | a half-open range (...] of indices        |
      | a full-open range                         |
      | a closed range                            |
      | all indices                               |
      | stepped half-open range [...) of indices  |
      | stepped half-open range (...] of indices  |
      | stepped full-open range of indices        |
      | stepped closed range of indices           |

