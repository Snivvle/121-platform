import { FspService } from './fsp.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { repositoryMockFactory } from '../../mock/repositoryMock.factory';
import { UserEntity } from '../../user/user.entity';
import { TransactionEntity } from '../program/transactions.entity';
import { FspCallLogEntity } from './fsp-call-log.entity';
import { FinancialServiceProviderEntity } from './financial-service-provider.entity';
import { AfricasTalkingApiService } from './fsp-api.service';
import { HttpModule } from '@nestjs/common/http';
import { ProgramEntity } from '../program/program.entity';
import { ConnectionEntity } from '../../sovrin/create-connection/connection.entity';
import { PaymentDetailsDto } from './dto/payment-details.dto';
import { StatusEnum } from '../../shared/enum/status.enum';

describe('Fsp service', (): void => {
  let service: FspService;
  let module: TestingModule;

  beforeAll(
    async (): Promise<void> => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [HttpModule],
        providers: [
          FspService,
          AfricasTalkingApiService,
          {
            provide: getRepositoryToken(TransactionEntity),
            useFactory: repositoryMockFactory,
          },
          {
            provide: getRepositoryToken(FspCallLogEntity),
            useFactory: repositoryMockFactory,
          },
          {
            provide: getRepositoryToken(FinancialServiceProviderEntity),
            useFactory: repositoryMockFactory,
          },
        ],
      }).compile();

      service = module.get<FspService>(FspService);
    },
  );

  afterAll(
    async (): Promise<void> => {
      module.close();
    },
  );

  it('should be defined', (): void => {
    expect(service).toBeDefined();
  });

  describe('createSendPaymentListFsp', (): void => {
    const connections = [new ConnectionEntity()];
    const program = new ProgramEntity();
    const fsp = new FinancialServiceProviderEntity();
    fsp.id = 1;

    const connectionList = [1];
    const paymentDetailsDto = {
      paymentList: connectionList,
      connectionsForFsp: [1],
    };

    it('should return default values', async (): Promise<void> => {
      const result = await service.createSendPaymentListFsp(
        fsp,
        connections,
        10,
        program,
        1,
      );
      expect(result.nrConnectionsFsp).toBeDefined();
      expect(service).toBeDefined();
    });

    it('should return paymentResult status succes', async (): Promise<void> => {
      const statusMessageDto = {
        status: StatusEnum.succes,
        message: {},
      };
      spyOn(service, 'createPaymentDetails').and.returnValue(
        Promise.resolve(paymentDetailsDto),
      );
      spyOn(service, 'sendPayment').and.returnValue(
        Promise.resolve(statusMessageDto),
      );
      spyOn(service, 'logFspCall').and.returnValue(Promise.resolve());
      // Comment add <any> to mock private functions
      spyOn<any>(service, 'storeTransaction').and.returnValue(
        Promise.resolve(),
      );

      const result = await service.createSendPaymentListFsp(
        fsp,
        connections,
        10,
        program,
        1,
      );
      expect(result.nrConnectionsFsp).toBe(connectionList.length);
      expect(result.paymentResult.status).toBe(StatusEnum.succes);
    });

    it('should return paymentResult status succes', async (): Promise<void> => {
      const statusMessageDto = {
        status: StatusEnum.succes,
        message: {},
      };
      spyOn(service, 'createPaymentDetails').and.returnValue(
        Promise.resolve(paymentDetailsDto),
      );
      spyOn(service, 'sendPayment').and.returnValue(
        Promise.resolve(statusMessageDto),
      );
      spyOn(service, 'logFspCall').and.returnValue(Promise.resolve());
      // Add <any> to mock private functions
      spyOn<any>(service, 'storeTransaction').and.returnValue(
        Promise.resolve(),
      );

      const result = await service.createSendPaymentListFsp(
        fsp,
        connections,
        10,
        program,
        1,
      );
      expect(result.nrConnectionsFsp).toBe(connectionList.length);
      expect(result.paymentResult.status).toBe(StatusEnum.succes);
      // This ts-ignore can be used to test if a private function has been called
      // @ts-ignore
      expect(service.storeTransaction).toHaveBeenCalled();
    });
    it('should return paymentResult status error', async (): Promise<void> => {
      const statusMessageDto = {
        status: StatusEnum.error,
        message: {},
      };
      spyOn(service, 'createPaymentDetails').and.returnValue(
        Promise.resolve(paymentDetailsDto),
      );

      spyOn(service, 'sendPayment').and.returnValue(
        Promise.resolve(statusMessageDto),
      );
      spyOn(service, 'logFspCall').and.returnValue(Promise.resolve());
      // Add <any> to mock private functions
      spyOn<any>(service, 'storeTransaction').and.returnValue(
        Promise.resolve(),
      );

      const result = await service.createSendPaymentListFsp(
        fsp,
        connections,
        10,
        program,
        1,
      );
      expect(result.nrConnectionsFsp).toBe(connectionList.length);
      expect(result.paymentResult.status).toBe(StatusEnum.error);

      // This ts-ignore can be used to test if a private function has been called
      // @ts-ignore
      expect(service.storeTransaction).not.toHaveBeenCalled();
    });
  });
});
