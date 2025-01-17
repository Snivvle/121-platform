import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionModule } from '../actions/action.module';
import { FinancialServiceProviderEntity } from '../fsp/financial-service-provider.entity';
import { FspQuestionEntity } from '../fsp/fsp-question.entity';
import { IntersolveVisaWalletEntity } from '../payments/fsp-integration/intersolve-visa/intersolve-visa-wallet.entity';
import { IntersolveVisaModule } from '../payments/fsp-integration/intersolve-visa/intersolve-visa.module';
import { IntersolveVoucherModule } from '../payments/fsp-integration/intersolve-voucher/intersolve-voucher.module';
import { PaymentsModule } from '../payments/payments.module';
import { TransactionEntity } from '../payments/transactions/transaction.entity';
import { TransactionsModule } from '../payments/transactions/transactions.module';
import { ProgramCustomAttributeEntity } from '../programs/program-custom-attribute.entity';
import { ProgramQuestionEntity } from '../programs/program-question.entity';
import { ProgramEntity } from '../programs/program.entity';
import { ProgramModule } from '../programs/programs.module';
import { RegistrationChangeLogModule } from '../registration/modules/registration-change-log/registration-change-log.module';
import { RegistrationDataEntity } from '../registration/registration-data.entity';
import { RegistrationEntity } from '../registration/registration.entity';
import { RegistrationsModule } from '../registration/registrations.module';
import { UserEntity } from '../user/user.entity';
import { UserModule } from '../user/user.module';
import { RegistrationDataQueryService } from '../utils/registration-data-query/registration-data-query.service';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProgramQuestionEntity,
      ProgramCustomAttributeEntity,
      FinancialServiceProviderEntity,
      FspQuestionEntity,
      RegistrationEntity,
      TransactionEntity,
      UserEntity,
      ProgramEntity,
      RegistrationDataEntity,
      IntersolveVisaWalletEntity,
    ]),
    ProgramModule,
    UserModule,
    RegistrationsModule,
    ActionModule,
    PaymentsModule,
    TransactionsModule,
    IntersolveVisaModule,
    IntersolveVoucherModule,
    RegistrationChangeLogModule,
  ],
  providers: [MetricsService, RegistrationDataQueryService],
  controllers: [MetricsController],
  exports: [],
})
export class MetricsModule {}
