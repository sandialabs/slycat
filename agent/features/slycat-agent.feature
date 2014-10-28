Feature: slycat-agent
  Scenario: unparsable command
    When an unparsable command is received
    Then the agent should return an invalid command error

  Scenario: invalid command
    When a parsable but invalid command is received
    Then the agent should return an invalid command error

  Scenario: missing action command
    When a command without an action is received
    Then the agent should return a missing action error

  Scenario: unknown command
    When an unknown command is received
    Then the agent should return an unknown command error

  Scenario: browse without path
    When a browse command without a path is received
    Then the agent should return a missing path error

  Scenario: browse relative path
    When browsing a relative path
    Then the agent should return a relative path error

  Scenario: browse nonexistent path
    When browsing a nonexistent path
    Then the agent should return a nonexistent path error

  Scenario: browse directory
    When browsing a directory
    Then the agent should return the directory information

  Scenario: browse directory with file reject rule
    When browsing a directory with a file reject rule
    Then the agent should return the directory information without the rejected files

  Scenario: browse directory with file allow rule
    When browsing a directory with file reject and allow rules
    Then the agent should return the directory information without the rejected files, with the allowed files

  Scenario: browse directory with directory reject rule
    When browsing a directory with a directory reject rule
    Then the agent should return the directory information without the rejected directories

  Scenario: browse directory with directory allow rule
    When browsing a directory with directory reject and allow rules
    Then the agent should return the directory information without the rejected directories, with the allowed directories

  Scenario: browse file
    Given a sample csv file
    When browsing the csv file
    Then the agent should return the file information

  Scenario: get file without path
    When retrieving a file without a path
    Then the agent should return a missing path error

  Scenario: get nonexistent file
    When retrieving a nonexistent file
    Then the agent should return a nonexistent path error

  Scenario: get csv file
    Given a sample csv file
    When retrieving the csv file
    Then the agent should return the csv file

  Scenario: get image without path
    When retrieving an image without a path
    Then the agent should return a missing path error

  Scenario: get nonexistent image
    When retrieving a nonexistent image
    Then the agent should return a nonexistent path error

  Scenario: get image with unsupported content type
    Given a sample jpeg image
    When retrieving an image using an unsupported content type
    Then the agent should return an unsupported content type error

  Scenario: get jpeg image
    Given a sample jpeg image
    When retrieving the jpeg image
    Then the agent should return the jpeg image

  Scenario: get jpeg image with maximum width
    Given a sample jpeg image
    When retrieving the jpeg image with maximum width
    Then the agent should return a jpeg image with maximum width

  Scenario: get jpeg image with maximum size along both dimensions
    Given a sample jpeg image
    When retrieving the jpeg image with maximum size
    Then the agent should return a jpeg image with maximum size

  Scenario: get jpeg image converted to png image
    Given a sample jpeg image
    When retrieving the jpeg image converted to a png image
    Then the agent should return the converted png image

  Scenario Outline: create video from sequence
    Given a sequence of <source type> images
    When creating a <target type> video
    Then the agent should return a video session id
    And the agent should return a <target type> video

    Examples:
      | source type | target type |
      | jpeg        | mp4         |
      | jpeg        | webm        |

