import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappModule } from '../notifications/whatsapp/whatsapp.module';
import { IntersolveBarcodeEntity } from '../payments/fsp-integration/intersolve/intersolve-barcode.entity';
import { IntersolveRequestEntity } from '../payments/fsp-integration/intersolve/intersolve-request.entity';
import { IntersolveModule } from '../payments/fsp-integration/intersolve/intersolve.module';
import { ProgramEntity } from '../programs/program.entity';
import { RegistrationEntity } from './../registration/registration.entity';
import { CronjobService } from './cronjob.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntersolveBarcodeEntity,
      ProgramEntity,
      IntersolveRequestEntity,
      RegistrationEntity,
    ]),
    WhatsappModule,
    IntersolveModule,
  ],
  providers: [CronjobService],
  controllers: [],
  exports: [CronjobService],
})
export class CronjobModule {}
