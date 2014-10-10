Feature: slycat agent command interface

  Scenario: unparsable command
    Given the slycat agent is running
     When an unparsable command is received
     Then the agent should return an unparsable command error

  Scenario: invalid command
    Given the slycat agent is running
     When an invalid command is received
     Then the agent should return an invalid command error

  Scenario: exit command
    Given the slycat agent is running
     When an exit command is received
     Then the agent should exit

  Scenario: get-image command
    Given the slycat agent is running
     When a get-image command is received
     Then the agent should return the image
