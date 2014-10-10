Feature: slycat-agent

  Scenario: unparsable command
    Given the slycat agent is running
     When an unparsable command is received
     Then the agent should return an invalid command error

  Scenario: invalid command
    Given the slycat agent is running
     When a parsable but invalid command is received
     Then the agent should return an invalid command error

  Scenario: unknown command
    Given the slycat agent is running
     When an unknown command is received
     Then the agent should return an unknown command error

  Scenario: missing action command
    Given the slycat agent is running
     When a command without an action is received
     Then the agent should return a missing action error

  Scenario: get-file command without path
    Given the slycat agent is running
     When a get-file command without a path is received
     Then the agent should return a missing path error

  Scenario: get-file command nonexistent file
    Given the slycat agent is running
     When a get-file command requests a nonexistent file
     Then the agent should return a nonexistent file error

  Scenario: get-file command csv file
    Given the slycat agent is running
     When a get-file command requests a csv file
     Then the agent should return the csv file

  Scenario: get-image command without path
    Given the slycat agent is running
     When a get-image command without a path is received
     Then the agent should return a missing path error

  Scenario: get-image command nonexistent file
    Given the slycat agent is running
     When a get-image command requests a nonexistent file
     Then the agent should return a nonexistent file error

  Scenario: get-image command jpeg file
    Given the slycat agent is running
     When a get-image command requests a jpeg file
     Then the agent should return the jpeg file
