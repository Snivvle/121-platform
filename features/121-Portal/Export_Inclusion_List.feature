@ho-portal
Feature: Export inclusion list

  Background:
    Given a logged-in user with "RegistrationPersonalEXPORT" permission
    And the "selected phase" is the "inclusion" phase

  Scenario: Export inclusion list
    When the user clicks the "export inclusion list" and confirms the confirm prompt
    Then an Excel-file is downloaded
    And it shows a list of the registrations that are "included"
    And it shows the "name" and other program-attributes to be able to identify people
    And it shows the dates at which the person reached each status, to be able to assess the trajectory towards inclusion
    And it shows all program questions which have "included" as "export" attribute
    And it shows all program custom attributes which have "included" as "export" attribute
    And it does not show any deprecated attributes
    And the "export inclusion list" button remains enabled, so the action can be repeated infinitely
    And if no "included" registrations then an alert is shown that "no data can be downloaded"

  Scenario: Export inclusion list with 2000 PAs
    Given there are 2000 PAs in the system (see Admin-user/Import_test_registrations_NL.feature)
    And they are included (see e.g. HO-Portal/Include_people_affected_Run_Program_role.feature)
    When the user clicks the "export inclusion list" and confirms the confirm prompt
    Then an Excel-file is downloaded as in the scenario above quickly and without problem

  Scenario: Viewing the export options without permission
    Given a logged-in does not have the "RegistrationPersonalEXPORT" permission
    When the user views the "inclusion" page
    Then the export list button is not visible
