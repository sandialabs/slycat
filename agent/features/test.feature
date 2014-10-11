Feature: slycat-agent

  Scenario: unparsable command
    Given the slycat agent is running
     When an unparsable command is received
     Then the agent should return an invalid command error

  Scenario: invalid command
    Given the slycat agent is running
     When a parsable but invalid command is received
     Then the agent should return an invalid command error

  Scenario: missing action command
    Given the slycat agent is running
     When a command without an action is received
     Then the agent should return a missing action error

  Scenario: unknown command
    Given the slycat agent is running
     When an unknown command is received
     Then the agent should return an unknown command error

  Scenario: browse without path
    Given the slycat agent is running
     When a browse command without a path is received
     Then the agent should return a missing path error

  Scenario: browse relative path
    Given the slycat agent is running
     When browsing a relative path
     Then the agent should return a relative path error

  Scenario: browse nonexistent path
    Given the slycat agent is running
     When browsing a nonexistent path
     Then the agent should return a nonexistent path error

  Scenario: browse directory
    Given the slycat agent is running
     When browsing a directory
     Then the agent should return the directory information

  Scenario: browse file
    Given the slycat agent is running
     When browsing a file
     Then the agent should return the file information

  Scenario: get file without path
    Given the slycat agent is running
     When retrieving a file without a path
     Then the agent should return a missing path error

  Scenario: get nonexistent file
    Given the slycat agent is running
     When retrieving a nonexistent file
     Then the agent should return a nonexistent path error

  Scenario: get csv file
    Given the slycat agent is running
     When retrieving a csv file
     Then the agent should return the csv file

  Scenario: get image without path
    Given the slycat agent is running
     When retrieving an image without a path
     Then the agent should return a missing path error

  Scenario: get nonexistent image
    Given the slycat agent is running
     When retrieving a nonexistent image
     Then the agent should return a nonexistent path error

  Scenario: get jpeg image
    Given the slycat agent is running
     When retrieving a jpeg file
     Then the agent should return the jpeg file

  Scenario: get jpeg image with maximum width
    Given the slycat agent is running
     When retrieving a jpeg file with maximum width
     Then the agent should return the jpeg file with maximum width

  Scenario: get jpeg image with maximum size along both dimensions
    Given the slycat agent is running
     When retrieving a jpeg file with maximum size
     Then the agent should return the jpeg file with maximum size

  Scenario: get jpeg image converted to png image
    Given the slycat agent is running
     When retrieving a jpeg file converted to a png file
     Then the agent should return the converted png file

