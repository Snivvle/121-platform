@ho-portal
Feature: Make a new payment

  Background:
    Given a logged-in user with the "run program" role
    And the user views the "payment" page

  Scenario: No PA included
    Given a new payment is possible on the program
    When the number of "PA included" is "0"
    Then the "start payout now" button is disabled

  Scenario: Show total amount
    Given a new payment is possible on the program
    And the number of "PA included" is more then "0"
    And the "Transfer Value" is filled in with the program's default value
    When the user clicks the button "start payout now"
    Then the pop-up "Are you sure?" is shown
    And the pop-up shows the number of PAs to pay out to
    And it shows the total amount to pay out
    And this total amount reflects that some PAs may receive more than the supplied "Transfer Value" because of a "paymentAmountMultiplier" greater than 1

  Scenario: Send payment instructions with changed transfer value
    Given the user changes the Transfer value to "20"
    And the user clicks the button "start payout now"
    And the pop-up "Are you sure?" is shown
    When the user clicks the button "OK"
    Then the payment instructions list is sent to the Financial Service Provider
    And the payment instructions for each PA contain the transfer value "20" times the PA's "paymentAmountMultiplier"
    And the message is shown according to the success of the transactions

  Scenario: Send payment instructions with at least 1 successful transaction
    Given this is not the last payment for the program
    And the user clicks the button "start payout now"
    And the pop-up "Are you sure?" is shown
    When the user clicks the button "OK"
    Then the payment instructions list is sent to the Financial Service Provider
    And the payment instructions for each PA contain the transfer value "20" times the PA's "paymentAmountMultiplier"
    And the message "Payout successful for X PA's and failed for Y (if Y>0) PA's" is shown
    And it shows an "OK" button
    When the users presses "OK" 
    Then the page refreshes
    And the "new payment" component now shows the number of the next payment
    And the "export payment data" component now shows that the payment is "closed"
    And the "export payment data" component now has the next payment enabled
    And the "PA-table" now has the payment column filled for every PA
    And for successfull transactions it shows a datetime, which can be clickable depending on the program
    And for failed transactions it shows 'Failed', which can be clickable depending on the program
    And a new empty payment column for the next payment is visible 
    And - for successfull transactions - the PA receives (notification about) voucher/cash depending on the FSP

  Scenario: Send payment instructions with 0 successful transactions
    When payment instructions are sent to the Financial Service Provider
    Then the message "Payout failed for all PA's" is shown
    And the payment is not processed and/or "closed"
    And the payment column contains 'Failed' for all PAs, which can be clickable depending on the program

  Scenario: Send payment instructions for 1000 PAs
    Given there are 1000 PAs in the system (to import: see Admin-user/Import_test_registrations_NL.feature)
    And they are included (see e.g. HO-Portal/Include_people_affected_Run_Program_role.feature)
    When the user clicks the "start payout now" button and confirms the confirm prompt
    Then a loading spinner starts which can take a long time (very rough estimation: 0.5 seconds per PA)
    When it is finished
    Then the regular popup with "Payout successful for X PA's and failed for Y (if Y>0) PA's" is shown
  
  Scenario: Send payment instructions to a Person Affected with Financial Service Provider "Intersolve"
    Given the Person Affected has chosen the option "receive voucher via whatsApp"
    When payment instructions are successfully sent (see scenario: Send payment instructions with at least 1 successful transaction)
    Then the Person Affected receives a whatsApp message
    And it mentions the amount of the voucher
    And it explains the Person Affected to reply 'yes' to receive the voucher
    When the Person Affected replies 'yes' (or anything else)
    Then the Person Affected receives a voucher image
    And it is accompanied by text that explains what is sent
    And a separate "explanation" image is sent that explains how to use the voucher in the store
    And a separate voucher image is sent for any old uncollected vouchers or for any other registrations on the same "whatsappPhoneNumber" 

------------------------------------------------------------------------------------------------------------------------------------
26/05/2021: Copied the below from Github wiki, as it has to be moved here. But not updating style yet, because the functionality will change soon. 

One or multiple registrations with the same payment-address(phone-number)

1. There is maximum one registration per payment-address.
  - Payment succeeds for all People Affected
  - Person Affected receives initial WhatsApp message about receiving one voucher (+ any older uncollected vouchers)
  - If replied "_yes_", the Person Affected receives:
    * a WhatsApp message about receiving one voucher (incl. the voucher image)
    * ... + any older uncollected vouchers (without text)
    * ... + one explanation image

2. There is 1 rejected and 1 included registration on one payment-address. 
  - Works exactly as (1)

3. There are 2 or more _included_ registrations on one payment-address.
  - Payment succeeds 
  - Person Affected receives initial WhatsApp message about receiving multiple vouchers for this week + also any older uncollected vouchers
  - If replied 'yes', Person Affected receives:
    * a WhatsApp message about receiving multiple vouchers (incl. the first voucher image)
    * ... + any additional vouchers for this week (without text)
    * ... + any older uncollected vouchers (without text)
    * ... + one explanation image

4. There are 2 (or more) included registrations on one payment address at moment of payout. But before "_yes_" reply, 1 (or more) are rejected.
  - Works exactly as (3)
  - The status at moment of payout is relevant, not the status at the moment of the "_yes_" reply.
  - This specifically enables to immediately end inclusion for People Affected after their last payout, without having to wait for their reply.