Feature: Project
  
  Background:
    Given a running Slycat server.
    And a browser is open
    And a project
    And the first project is open

  Scenario: Create a Parameterspace model
    Given a sample Parameterspace csv file
    When I open the create parameterspace model wizard
    And I enter model information
    And I select a local file
    And I select values for the columns
    Then I should be on the model page
