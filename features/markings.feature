Feature: Markings

  Scenario: Allowed markings.
    When: The server configuration specifies a list of allowed markings.
    Then: The server must not start unless a plugin exists for every allowed marking.
    And: The server must reject models with unallowed markings.
    And: Unallowed markings must not appear in command-line client listings.
    And: Unallowed markings must not appear in the user interface.
