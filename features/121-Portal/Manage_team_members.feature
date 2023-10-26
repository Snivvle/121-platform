  @ho-portal

  Background:
    Given user is on team members page

  Scenario: View "Team Members"
    Given user is on Team Members page
    When Details are displayed in table in order (Name, Role, Status, Last login)
    And possible Roles can be configured per program
    And status can be Active
    And last login is displayed in format (dd/mm/yyyy) or empty
    And user clicks on a column users are sorted alphabetically or numerically
    And above Team Members table on the left side filtering field is displayed
    And on the right side on top of user table "Add/change team member" button is displayed

  Scenario: Add New Team member
    When User clicks on "Add new user" button
    And pop-up is displayed
    Then user enter team members email
    And Selects Role for team member by clicking on check boxes
    Then Clicks on "Add" butto
    And Notification with "You've succsessfully added a team member" message is displayed
    And user clicks on "X" on popup
    And Popup is closed

  Scenario: Edit Team members Role

    Given There is a team member on the list
    When User clicks on Three dot icon on the right side of row where team member is displayed
    And Meatball menu is displayed
    And User clicks on "Edit user"
    Then pop-up is displayed
    And user is not able to edit email
    And User changes Role of team member by clicking on checkboxes
    And click "Save" button
    Then "You've succsessfully edited the role(s) of this user"
    And user clicks on "X" on popup
    And Popup is closed

  Scenario: Remove team member
    Given There is a team member on the list
    When User clicks on Three dot icon on the right side of row where team member is displayed
    And Meatball menu is displayed
    And User clicks on "Remove user"
    And warning message is displayed
    And user clicks on "Remove"
    Then "You've succsessfully removed this team member" message is displayed
    And user clicks on "X" on popup
    And Popup is closed

  Scenario: View error messages
    Given user clicks on Add user button
    And popup window is displayed
    When user that has already been added
    Then error message "This user is already a team member." is displayed
    And when email is changed to valid open
    And user does not assign at least one role
    Then error message "Please assign at least one role." is displayed
