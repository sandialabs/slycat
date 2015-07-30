Feature: Slycat Web Server

  Background:
    Given a running Slycat server.
    And a browser is open

  Scenario: Create a project
    Given I am on the front page
    When I open the new project wizard
    And I enter a project name and description
    And I click Finish
    And I open the project page
    Then I should be on the project page

  Scenario: Edit a project
    Given I have a project
    When I open the first project
    And I open the edit project wizard
    And I enter new values in the edit form
    And I click Save Changes
    Then I should be on the project page
    And I should see my values on the project


  Scenario: Delete a project
    Given I have a project
    And I am on the front page
    When I open the first project
    And I choose Delete Project
    And I confirm by clicking Delete Project
    Then I should not see a project on the front page
