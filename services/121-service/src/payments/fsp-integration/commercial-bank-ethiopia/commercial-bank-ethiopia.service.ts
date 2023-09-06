import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FspName } from '../../../fsp/enum/fsp-name.enum';
import { ProgramFspConfigurationEntity } from '../../../programs/fsp-configuration/program-fsp-configuration.entity';
import { ProgramEntity } from '../../../programs/program.entity';
import { RegistrationEntity } from '../../../registration/registration.entity';
import { StatusEnum } from '../../../shared/enum/status.enum';
import { PaPaymentDataDto } from '../../dto/pa-payment-data.dto';
import {
  FspTransactionResultDto,
  PaTransactionResultDto,
} from '../../dto/payment-transaction-result.dto';
import { TransactionEntity } from '../../transactions/transaction.entity';
import { TransactionsService } from '../../transactions/transactions.service';
import { FinancialServiceProviderIntegrationInterface } from '../fsp-integration.interface';
import { CommercialBankEthiopiaApiService } from './commercial-bank-ethiopia.api.service';
import {
  CommercialBankEthiopiaRegistrationData,
  CommercialBankEthiopiaTransferPayload,
} from './dto/commercial-bank-ethiopia-transfer-payload.dto';

@Injectable()
export class CommercialBankEthiopiaService
  implements FinancialServiceProviderIntegrationInterface
{
  @InjectRepository(RegistrationEntity)
  private readonly registrationRepository: Repository<RegistrationEntity>;
  @InjectRepository(TransactionEntity)
  public transactionRepository: Repository<TransactionEntity>;
  @InjectRepository(ProgramEntity)
  public programRepository: Repository<ProgramEntity>;
  @InjectRepository(ProgramFspConfigurationEntity)
  public programFspConfigurationRepository: Repository<ProgramFspConfigurationEntity>;

  public constructor(
    private readonly commercialBankEthiopiaApiService: CommercialBankEthiopiaApiService,
    private readonly transactionsService: TransactionsService,
  ) {}

  public async sendPayment(
    paPaymentList: PaPaymentDataDto[],
    programId: number,
    paymentNr: number,
  ): Promise<FspTransactionResultDto> {
    const config = await this.programFspConfigurationRepository
      .createQueryBuilder('fspConfig')
      .select('name')
      .addSelect('value')
      .where('fspConfig.programId = :programId', { programId })
      .andWhere('fsp.fsp = :fspName', { fspName: paPaymentList[0].fspName })
      .leftJoin('fspConfig.fsp', 'fsp')
      .getRawMany();

    const credentials: { username: string; password: string } = {
      username: config.find((c) => c.name === 'username')?.value,
      password: config.find((c) => c.name === 'password')?.value,
    };

    const program = await this.programRepository.findOneBy({
      id: programId,
    });

    const fspTransactionResult = new FspTransactionResultDto();
    fspTransactionResult.paList = [];
    fspTransactionResult.fspName = FspName.commercialBankEthiopia;

    const referenceIds = paPaymentList.map(
      (paPayment) => paPayment.referenceId,
    );
    const registrationData = await this.getRegistrationData(referenceIds);

    for (const paPayment of paPaymentList) {
      const paRegistrationData = await this.getPaRegistrationData(
        paPayment,
        registrationData,
      );

      const payload = this.createPayloadPerPa(
        paPayment,
        paRegistrationData,
        program,
      );

      const paymentRequestResultPerPa = await this.sendPaymentPerPa(
        payload,
        paPayment.referenceId,
        credentials,
      );
      fspTransactionResult.paList.push(paymentRequestResultPerPa);
      // Storing the per payment so you can continiously seed updates of transactions in HO-Portal
      await this.transactionsService.storeTransactionUpdateStatus(
        paymentRequestResultPerPa,
        programId,
        paymentNr,
      );
    }
    return fspTransactionResult;
  }

  public async getPaRegistrationData(
    paPayment: PaPaymentDataDto,
    registrationData: CommercialBankEthiopiaRegistrationData[],
  ): Promise<CommercialBankEthiopiaRegistrationData[]> {
    const paRegistrationData = registrationData.filter(
      (item) => item.referenceId === paPayment.referenceId,
    );

    if (paPayment.transactionId) {
      const transaction = await this.transactionRepository.findOneBy({
        id: paPayment.transactionId,
      });
      const customData = {
        ...transaction.customData,
      };
      paRegistrationData.push({
        referenceId: paPayment.referenceId,
        fieldName: 'debitTheIrRef',
        value: customData['requestResult'].debitTheIrRef,
      });
    }

    return paRegistrationData;
  }

  public async getRegistrationData(
    referenceIds: string[],
  ): Promise<CommercialBankEthiopiaRegistrationData[]> {
    const registrationData = await this.registrationRepository
      .createQueryBuilder('registration')
      .select([
        'registration.referenceId AS "referenceId"',
        'data.value AS value',
        'COALESCE("programQuestion".name, "fspQuestion".name) AS "fieldName"',
      ])
      .where('registration.referenceId IN (:...referenceIds)', {
        referenceIds: referenceIds,
      })
      .andWhere(
        '(programQuestion.name IN (:...names) OR fspQuestion.name IN (:...names))',
        {
          names: ['name', 'bankAccountNumber'],
        },
      )
      .leftJoin('registration.data', 'data')
      .leftJoin('data.programQuestion', 'programQuestion')
      .leftJoin('data.fspQuestion', 'fspQuestion')
      .getRawMany();

    // Filter out properties with null values from each object
    const nonEmptyRegistrationData = registrationData.map(
      (data: CommercialBankEthiopiaRegistrationData) => {
        for (const key in data) {
          if (data.hasOwnProperty(key) && data[key] === null) {
            delete data[key];
          }
        }
        return data;
      },
    );

    return nonEmptyRegistrationData;
  }

  public createPayloadPerPa(
    payment: PaPaymentDataDto,
    paRegistrationData: CommercialBankEthiopiaRegistrationData[],
    program: ProgramEntity,
  ): CommercialBankEthiopiaTransferPayload {
    let name;
    let bankAccountNumber;
    let debitTheIrRefRetry;

    paRegistrationData.forEach((data) => {
      if (data.fieldName === 'name') {
        name = data.value;
      } else if (data.fieldName === 'bankAccountNumber') {
        bankAccountNumber = data.value;
      } else if ((data.fieldName = 'debitTheIrRef')) {
        debitTheIrRefRetry = data.value;
      }
    });

    function padTo2Digits(num: number): string {
      return num.toString().padStart(2, '0');
    }

    function formatDate(date: Date): string {
      return [
        date.getFullYear().toString().substring(2),
        padTo2Digits(date.getMonth() + 1),
        padTo2Digits(date.getDate()),
      ].join('');
    }

    const payload = {
      debitAmount: payment.transactionAmount,
      debitTheIrRef:
        debitTheIrRefRetry ||
        `${formatDate(new Date())}${this.generateRandomNumerics(10)}`,
      creditTheIrRef: program.ngo,
      creditAcctNo: bankAccountNumber,
      creditCurrency: program.currency,
      remitterName: program.titlePaApp['en'].substring(0, 35),
      beneficiaryName: `${name}`,
    };

    return payload;
  }

  public async sendPaymentPerPa(
    payload: CommercialBankEthiopiaTransferPayload,
    referenceId: string,
    credentials: { username: string; password: string },
  ): Promise<PaTransactionResultDto> {
    const paTransactionResult = new PaTransactionResultDto();
    paTransactionResult.fspName = FspName.commercialBankEthiopia;
    paTransactionResult.referenceId = referenceId;
    paTransactionResult.date = new Date();
    paTransactionResult.calculatedAmount = payload.debitAmount;

    let result = await this.commercialBankEthiopiaApiService.creditTransfer(
      payload,
      credentials,
    );

    if (result && result.resultDescription === 'Transaction is DUPLICATED') {
      result = await this.commercialBankEthiopiaApiService.getTransactionStatus(
        payload,
        credentials,
      );
    }

    if (
      result &&
      result.Status &&
      result.Status.successIndicator &&
      result.Status.successIndicator._text === 'Success'
    ) {
      paTransactionResult.status = StatusEnum.success;
      payload.status = StatusEnum.success;
    } else {
      paTransactionResult.status = StatusEnum.error;
      paTransactionResult.message =
        result.resultDescription ||
        (result.Status &&
          result.Status.messages &&
          (result.Status.messages.length > 0
            ? result.Status.messages[0]._text
            : result.Status.messages._text));
    }

    paTransactionResult.customData = {
      requestResult: payload,
      paymentResult: result,
    };
    return paTransactionResult;
  }

  private generateRandomNumerics(length: number): string {
    const alphanumericCharacters = '0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(
        Math.random() * alphanumericCharacters.length,
      );
      result += alphanumericCharacters.charAt(randomIndex);
    }

    return result;
  }
}