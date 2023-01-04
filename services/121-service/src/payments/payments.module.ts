import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionModule } from '../actions/action.module';
import { FspModule } from '../fsp/fsp.module';
import { ProgramEntity } from '../programs/program.entity';
import { RegistrationEntity } from '../registration/registration.entity';
import { UserModule } from '../user/user.module';
import { UserEntity } from './../user/user.entity';
import { AfricasTalkingModule } from './fsp-integration/africas-talking/africas-talking.module';
import { BelcashModule } from './fsp-integration/belcash/belcash.module';
import { BobFinanceModule } from './fsp-integration/bob-finance/bob-finance.module';
import { IntersolveModule } from './fsp-integration/intersolve/intersolve.module';
import { UkrPoshtaModule } from './fsp-integration/ukrposhta/ukrposhta.module';
import { VodacashModule } from './fsp-integration/vodacash/vodacash.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TransactionEntity } from './transactions/transaction.entity';
import { TransactionsModule } from './transactions/transactions.module';

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
    VodacashModule,
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
