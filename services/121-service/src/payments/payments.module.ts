import { BobFinanceModule } from './fsp-integration/bob-finance/bob-finance.module';
import { UserEntity } from './../user/user.entity';
import { Module, HttpModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionModule } from '../actions/action.module';
import { FspModule } from '../fsp/fsp.module';
import { ProgramEntity } from '../programs/program.entity';
import { RegistrationEntity } from '../registration/registration.entity';
import { UserModule } from '../user/user.module';
import { AfricasTalkingModule } from './fsp-integration/africas-talking/africas-talking.module';
import { BelcashModule } from './fsp-integration/belcash/belcash.module';
import { IntersolveModule } from './fsp-integration/intersolve/intersolve.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TransactionEntity } from './transactions/transaction.entity';
import { TransactionsModule } from './transactions/transactions.module';
import { UkrPoshtaModule } from './fsp-integration/ukrposhta/ukrposhta.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProgramEntity,
      TransactionEntity,
      RegistrationEntity,
      UserEntity,
    ]),
    UserModule,
    HttpModule,
    ActionModule,
    FspModule,
    IntersolveModule,
    AfricasTalkingModule,
    BelcashModule,
    TransactionsModule,
    BobFinanceModule,
    UkrPoshtaModule,
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
