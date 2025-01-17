import { RegistrationStatusEnum } from '../../../src/registration/enum/registration-status.enum';
import { SeedScript } from '../../../src/scripts/seed-script.enum';
import { ProgramPhase } from '../../../src/shared/enum/program-phase.model';
import { changePhase } from '../../helpers/program.helper';
import {
  awaitChangePaStatus,
  getRegistrations,
  importRegistrations,
} from '../../helpers/registration.helper';
import { getAccessToken, resetDB } from '../../helpers/utility.helper';
import {
  expectedAttributes,
  expectedValueObject1,
  expectedValueObject3,
  expectedValueObject4,
  programId,
  registration1,
  registration2,
  registration3,
  registration4,
} from './pagination-data';

describe('Load PA table', () => {
  describe('getting registration using paginate', () => {
    let accessToken: string;

    beforeAll(async () => {
      await resetDB(SeedScript.nlrcMultiple);
      accessToken = await getAccessToken();

      await changePhase(
        programId,
        ProgramPhase.registrationValidation,
        accessToken,
      );

      await importRegistrations(
        programId,
        [registration1, registration2, registration3, registration4],
        accessToken,
      );

      await awaitChangePaStatus(
        programId,
        [registration1.referenceId],
        RegistrationStatusEnum.included,
        accessToken,
      );
    });

    it('should filter based on status', async () => {
      // Act
      const getRegistrationsResponse = await getRegistrations(
        programId,
        null,
        accessToken,
        null,
        null,
        { 'filter.status': 'included' },
      );
      const data = getRegistrationsResponse.body.data;
      const meta = getRegistrationsResponse.body.meta;
      // Assert
      for (const [key, value] of Object.entries(expectedValueObject1)) {
        expect(data[0][key]).toBe(value);
      }
      for (const attribute of expectedAttributes) {
        expect(data[0]).toHaveProperty(attribute);
      }
      expect(meta.totalItems).toBe(1);
    });

    it('should filter based on registration data', async () => {
      // Act
      const getRegistrationsResponse = await getRegistrations(
        programId,
        null,
        accessToken,
        null,
        null,
        { 'filter.whatsappPhoneNumber': registration4.whatsappPhoneNumber },
      );
      const data = getRegistrationsResponse.body.data;
      const meta = getRegistrationsResponse.body.meta;
      // Assert
      for (const [key, value] of Object.entries(expectedValueObject4)) {
        expect(data[0][key]).toBe(value);
      }
      for (const attribute of expectedAttributes) {
        expect(data[0]).toHaveProperty(attribute);
      }
      expect(meta.totalItems).toBe(1);
    });

    it('should filter based on root attributes & registration data', async () => {
      // Act
      const getRegistrationsResponse = await getRegistrations(
        programId,
        null,
        accessToken,
        null,
        null,
        {
          'filter.whatsappPhoneNumber': registration3.whatsappPhoneNumber,
          'filter.preferredLanguage': registration3.preferredLanguage,
        },
      );
      const data = getRegistrationsResponse.body.data;
      const meta = getRegistrationsResponse.body.meta;
      // Assert
      for (const [key, value] of Object.entries(expectedValueObject3)) {
        expect(data[0][key]).toBe(value);
      }
      for (const attribute of expectedAttributes) {
        expect(data[0]).toHaveProperty(attribute);
      }
      expect(meta.totalItems).toBe(1);
    });

    it('should filter using in, eq, ilike and null', async () => {
      // Act
      // Each of the filters would seperately return
      const getRegistrationsResponse = await getRegistrations(
        programId,
        null,
        accessToken,
        null,
        null,
        {
          'filter.whatsappPhoneNumber': `$ilike:${registration3.whatsappPhoneNumber.substring(
            0,
            1,
          )}`,
          'filter.preferredLanguage': `$in:nonExisting,${registration3.preferredLanguage}`,
          'filter.addressCity': `$eq:${registration3.addressCity}`,
        },
      );
      const data = getRegistrationsResponse.body.data;
      const meta = getRegistrationsResponse.body.meta;
      // Assert
      for (const [key, value] of Object.entries(expectedValueObject3)) {
        expect(data[0][key]).toBe(value);
      }
      for (const attribute of expectedAttributes) {
        expect(data[0]).toHaveProperty(attribute);
      }
      expect(meta.totalItems).toBe(1);
    });
  });
});
