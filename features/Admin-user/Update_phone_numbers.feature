@swagger-ui
Feature: Update phone-numbers of Person Affected

  Background:
    Given a logged-in "admin" user in the Swagger UI

  Scenario: Successfully update phone-number of Person Affected
    Given the new "phoneNumber" is provided
    Given the "referenceId" of the Person Affected is provided
    When the user fills in the "referenceId" and the "phoneNumber" and "phoneNumber" as "attribute" as body and calls the "POST /registrations/attribute" endpoint
    Then a "registration" with all its attributes is returned
    And it should reflect the updated "phoneNumber" attribute
    And it should reflect the updated "customData.phoneNumber" attribute
    And the "PA-table" in the "HO-portal" should now reflect the new phone-number for this Person Affected

  Scenario: Successful update whatsApp phone-number of Person Affected
    Given the new "whatsappPhoneNumber" is provided
    Given the "referenceId" of the Person Affected is provided
    When the user fills in the "referenceId" and the "whatsappPhoneNumber" and "whatsappPhoneNumber" as "attribute" in as body and calls the "POST /registrations/attribute" endpoint
    Then a "registration" with all its attributes is returned
    And it should reflect the updated "customData.whatsappPhoneNumber" attribute
    And the "PA-table" in the "HO-portal" should now reflect the new whatsApp phone-number for this Person Affected
