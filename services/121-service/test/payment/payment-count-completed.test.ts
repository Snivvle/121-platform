import { HttpStatus } from '@nestjs/common';
import { FspName } from '../../src/fsp/enum/fsp-name.enum';
import { RegistrationStatusEnum } from '../../src/registration/enum/registration-status.enum';
import { SeedScript } from '../../src/scripts/seed-script.enum';
import { ProgramPhase } from '../../src/shared/enum/program-phase.model';
import { StatusEnum } from '../../src/shared/enum/status.enum';
import {
  changePhase,
  doPayment,
  getTransactions,
  waitForPaymentTransactionsToComplete,
} from '../helpers/program.helper';
import {
  awaitChangePaStatus,
  getRegistrations,
  importRegistrations,
} from '../helpers/registration.helper';
import { getAccessToken, resetDB } from '../helpers/utility.helper';
import { waitFor } from '../../src/utils/waitFor.helper';

describe('Do a payment to a PA with maxPayments=1', () => {
  const programId = 1;
  const referenceIdAh = '63e62864557597e0d-AH';
  const payment = 1;
  const amount = 22;
  const registrationAh = {
    referenceId: referenceIdAh,
    preferredLanguage: 'en',
    paymentAmountMultiplier: 1,
    nameFirst: 'John',
    nameLast: 'Smith',
    phoneNumber: '14155238886',
    fspName: FspName.intersolveVoucherWhatsapp,
    whatsappPhoneNumber: '14155238886',
    maxPayments: 1,
  };

  describe('with FSP: Intersolve Voucher WhatsApp', () => {
    let accessToken: string;

    beforeEach(async () => {
      await resetDB(SeedScript.nlrcMultiple);
      accessToken = await getAccessToken();

      await changePhase(
        programId,
        ProgramPhase.registrationValidation,
        accessToken,
      );
      await changePhase(programId, ProgramPhase.inclusion, accessToken);
      await changePhase(programId, ProgramPhase.payment, accessToken);
    });

    it('should set registration to complete', async () => {
      // Arrange
      await importRegistrations(programId, [registrationAh], accessToken);
      await awaitChangePaStatus(
        programId,
        [referenceIdAh],
        RegistrationStatusEnum.included,
        accessToken,
      );
      const paymentReferenceIds = [referenceIdAh];

      // Act
      const doPaymentResponse = await doPayment(
        programId,
        payment,
        amount,
        paymentReferenceIds,
        accessToken,
      );

      // Assert
      await waitForPaymentTransactionsToComplete(
        programId,
        [referenceIdAh],
        accessToken,
        8000,
      );

      const getTransactionsRes = await getTransactions(
        programId,
        payment,
        referenceIdAh,
        accessToken,
      );
      const getTransactionsBody = getTransactionsRes.body;
      // Wait for registration to be updated
      const timeout = 80000; // Timeout in milliseconds
      const interval = 1000; // Interval between retries in milliseconds
      let elapsedTime = 0;
      let getRegistration = null;
      while (
        (!getRegistration || getRegistration.paymentCount !== 1) &&
        elapsedTime < timeout
      ) {
        const getRegistraitonRes = await getRegistrations(
          programId,
          null,
          accessToken,
        );
        getRegistration = getRegistraitonRes.body.data[0];

        await waitFor(interval);
        elapsedTime += interval;
      }
      // Assert
      expect(doPaymentResponse.status).toBe(HttpStatus.ACCEPTED);
      expect(doPaymentResponse.body.applicableCount).toBe(
        paymentReferenceIds.length,
      );
      expect(getTransactionsBody[0].status).toBe(StatusEnum.success);
      expect(getTransactionsBody[0].errorMessage).toBe(null);

      expect(getRegistration.status).toBe(RegistrationStatusEnum.completed);
      expect(getRegistration.paymentCountRemaining).toBe(0);
      expect(getRegistration.paymentCount).toBe(1);
    });
  });
});
