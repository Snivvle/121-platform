import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateQuery } from 'nestjs-paginate';
import { And, In, IsNull, Not, Repository, SelectQueryBuilder } from 'typeorm';
import { MessageContentType } from '../../notifications/enum/message-type.enum';
import { MessageService } from '../../notifications/message.service';
import { TwilioMessageEntity } from '../../notifications/twilio.entity';
import { TryWhatsappEntity } from '../../notifications/whatsapp/try-whatsapp.entity';
import { WhatsappPendingMessageEntity } from '../../notifications/whatsapp/whatsapp-pending-message.entity';
import { IntersolveVoucherEntity } from '../../payments/fsp-integration/intersolve-voucher/intersolve-voucher.entity';
import { SafaricomRequestEntity } from '../../payments/fsp-integration/safaricom/safaricom-request.entity';
import { ImageCodeExportVouchersEntity } from '../../payments/imagecode/image-code-export-vouchers.entity';
import { PersonAffectedAppDataEntity } from '../../people-affected/person-affected-app-data.entity';
import { ProgramEntity } from '../../programs/program.entity';
import { AzureLogService } from '../../shared/services/azure-log.service';
import { BulkActionResultDto } from '../dto/bulk-action-result.dto';
import { RegistrationStatusEnum } from '../enum/registration-status.enum';
import { RegistrationDataEntity } from '../registration-data.entity';
import { RegistrationViewEntity } from '../registration-view.entity';
import { RegistrationEntity } from '../registration.entity';
import { RegistrationsService } from '../registrations.service';
import { RegistrationsPaginationService } from './registrations-pagination.service';

@Injectable()
export class RegistrationsBulkService {
  @InjectRepository(RegistrationEntity)
  private readonly registrationRepository: Repository<RegistrationEntity>;
  @InjectRepository(ProgramEntity)
  private readonly programRepository: Repository<ProgramEntity>;
  @InjectRepository(RegistrationDataEntity)
  private readonly registrationDataRepository: Repository<RegistrationDataEntity>;
  @InjectRepository(TryWhatsappEntity)
  private readonly tryWhatsappRepository: Repository<TryWhatsappEntity>;
  @InjectRepository(PersonAffectedAppDataEntity)
  private readonly personAffectedAppDataRepository: Repository<PersonAffectedAppDataEntity>;
  @InjectRepository(TwilioMessageEntity)
  private readonly twilioMessageRepository: Repository<TwilioMessageEntity>;
  @InjectRepository(WhatsappPendingMessageEntity)
  private readonly whatsappPendingMessageRepository: Repository<WhatsappPendingMessageEntity>;
  @InjectRepository(ImageCodeExportVouchersEntity)
  private readonly imageCodeExportVouchersRepo: Repository<ImageCodeExportVouchersEntity>;
  @InjectRepository(IntersolveVoucherEntity)
  private readonly intersolveVoucherRepo: Repository<IntersolveVoucherEntity>;
  @InjectRepository(SafaricomRequestEntity)
  private readonly safaricomRequestRepo: Repository<SafaricomRequestEntity>;
  @InjectRepository(RegistrationViewEntity)
  private readonly registrationViewRepository: Repository<RegistrationViewEntity>;

  public constructor(
    private readonly registrationsService: RegistrationsService,
    private readonly registrationsPaginationService: RegistrationsPaginationService,
    private readonly azureLogService: AzureLogService,
    private readonly messageService: MessageService,
  ) {}

  public async patchRegistrationsStatus(
    paginateQuery: PaginateQuery,
    programId: number,
    registrationStatus: RegistrationStatusEnum,
    dryRun: boolean,
    message?: string,
    messageContentType?: MessageContentType,
  ): Promise<BulkActionResultDto> {
    // Overwrite the default select, as we only need the referenceId
    paginateQuery = this.setQueryPropertiesBulkAction(paginateQuery);

    const allowedCurrentStatuses =
      this.getAllowedCurrentStatusesForNewStatus(registrationStatus);

    const resultDto = await this.getBulkActionResult(
      paginateQuery,
      programId,
      this.getStatusUpdateBaseQuery(allowedCurrentStatuses), // We need to create a seperate querybuilder object twice or it will be modified twice
    );
    if (!dryRun) {
      this.updateRegistrationStatusBatchFilter(
        paginateQuery,
        programId,
        registrationStatus,
        message,
        messageContentType,
        this.getStatusUpdateBaseQuery(allowedCurrentStatuses), // We need to create a seperate querybuilder object twice or it will be modified twice
      ).catch((error) => {
        this.azureLogService.logError(error, true);
      });
    }
    // Get the refrenceIds for the update seperately as running a query with no limit is slower
    // so you show the result of the applicable registrations earlier
    return resultDto;
  }

  public async deleteRegistrations(
    paginateQuery: PaginateQuery,
    programId: number,
    dryRun: boolean,
  ): Promise<BulkActionResultDto> {
    paginateQuery = this.setQueryPropertiesBulkAction(paginateQuery);

    const allowedCurrentStatuses = this.getAllowedCurrentStatusesForNewStatus(
      RegistrationStatusEnum.deleted,
    );

    const resultDto = await this.getBulkActionResult(
      paginateQuery,
      programId,
      this.getStatusUpdateBaseQuery(allowedCurrentStatuses), // We need to create a seperate querybuilder object twice or it will be modified twice
    );

    const registrationForUpdate =
      await this.registrationsPaginationService.getPaginate(
        paginateQuery,
        programId,
        false,
        true,
        this.getStatusUpdateBaseQuery(allowedCurrentStatuses), // We need to create a seperate querybuilder object twice or it will be modified twice
      );
    const referenceIds = registrationForUpdate.data.map(
      (registration) => registration.referenceId,
    );
    if (!dryRun) {
      this.deleteBatch(referenceIds).catch((error) => {
        this.azureLogService.logError(error, true);
      });
    }
    return resultDto;
  }

  public async postMessages(
    paginateQuery: PaginateQuery,
    programId: number,
    message: string,
    dryRun: boolean,
  ): Promise<BulkActionResultDto> {
    paginateQuery = this.setQueryPropertiesBulkAction(paginateQuery);

    const resultDto = await this.getBulkActionResult(
      paginateQuery,
      programId,
      this.getCustomMessageBaseQuery(), // We need to create a seperate querybuilder object twice or it will be modified twice
    );

    const registrationForUpdate =
      await this.registrationsPaginationService.getPaginate(
        paginateQuery,
        programId,
        false,
        true,
        this.getCustomMessageBaseQuery(), // We need to create a seperate querybuilder object twice or it will be modified twice
      );
    const referenceIds = registrationForUpdate.data.map(
      (registration) => registration.referenceId,
    );
    if (!dryRun) {
      this.sendCustomTextMessage(referenceIds, message).catch((error) => {
        this.azureLogService.logError(error, true);
      });
    }
    return resultDto;
  }

  public async getBulkActionResult(
    paginateQuery: PaginateQuery,
    programId: number,
    queryBuilder: SelectQueryBuilder<RegistrationViewEntity>,
  ): Promise<BulkActionResultDto> {
    const selectedRegistrations =
      await this.registrationsPaginationService.getPaginate(
        paginateQuery,
        programId,
        true,
        false,
      );

    const applicableRegistrations =
      await this.registrationsPaginationService.getPaginate(
        paginateQuery,
        programId,
        true,
        false,
        queryBuilder,
      );

    return {
      totalFilterCount: selectedRegistrations.meta.totalItems,
      applicableCount: applicableRegistrations.meta.totalItems,
      nonApplicableCount:
        selectedRegistrations.meta.totalItems -
        applicableRegistrations.meta.totalItems,
    };
  }

  public getBaseQuery(): SelectQueryBuilder<RegistrationViewEntity> {
    return this.registrationViewRepository
      .createQueryBuilder('registration')
      .andWhere({ status: Not(RegistrationStatusEnum.deleted) });
  }

  public setQueryPropertiesBulkAction(
    query: PaginateQuery,
    includePaymentMultiplier = false,
  ): PaginateQuery {
    query.select = ['referenceId'];
    if (includePaymentMultiplier) {
      query.select.push('paymentAmountMultiplier');
    }
    query.page = null;
    return query;
  }

  private getStatusUpdateBaseQuery(
    allowedCurrentStatuses: RegistrationStatusEnum[],
  ): SelectQueryBuilder<RegistrationViewEntity> {
    return this.getBaseQuery().andWhere({ status: In(allowedCurrentStatuses) });
  }

  private getCustomMessageBaseQuery(): SelectQueryBuilder<RegistrationViewEntity> {
    return this.getBaseQuery().andWhere({
      phoneNumber: And(Not(IsNull()), Not('')),
    });
  }

  private async updateRegistrationStatusBatchFilter(
    query: PaginateQuery,
    programId: number,
    registrationStatus: RegistrationStatusEnum,
    message?: string,
    messageContentType?: MessageContentType,
    queryBuilder?: SelectQueryBuilder<RegistrationViewEntity>,
  ): Promise<void> {
    const registrationForUpdate =
      await this.registrationsPaginationService.getPaginate(
        query,
        programId,
        false,
        true,
        queryBuilder,
      );
    const referenceIds = registrationForUpdate.data.map(
      (registration) => registration.referenceId,
    );
    await this.updateRegistrationStatusBatch(
      referenceIds,
      registrationStatus,
      message,
      messageContentType,
    );
  }

  private async updateRegistrationStatusBatch(
    referenceIds: string[],
    registrationStatus: RegistrationStatusEnum,
    message?: string,
    messageContentType?: MessageContentType,
  ): Promise<void> {
    let programId;
    let program;
    for (const referenceId of referenceIds) {
      const updatedRegistration =
        await this.registrationsService.setRegistrationStatus(
          referenceId,
          registrationStatus,
        );
      if (message && updatedRegistration) {
        if (updatedRegistration.programId !== programId) {
          programId = updatedRegistration.programId;
          // avoid a query per PA if not necessary
          program = await this.programRepository.findOne({
            where: { id: programId },
          });
        }
        const tryWhatsappFirst =
          registrationStatus === RegistrationStatusEnum.invited
            ? program.tryWhatsAppFirst
            : false;
        try {
          await this.messageService.sendTextMessage(
            updatedRegistration,
            programId,
            message,
            null,
            tryWhatsappFirst,
            messageContentType,
          );
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            throw error;
          } else {
            this.azureLogService.logError(error, true);
          }
        }
      }
    }
  }

  private async deleteBatch(referenceIds: string[]): Promise<void> {
    // Do this first, so that error is already thrown if a PA cannot be changed to deleted, before removing any data below
    await this.checkAllowedStatusChangeOrThrow(
      referenceIds,
      RegistrationStatusEnum.deleted,
    );
    await this.updateRegistrationStatusBatch(
      referenceIds,
      RegistrationStatusEnum.deleted,
    );

    for await (const referenceId of referenceIds) {
      const registration =
        await this.registrationsService.getRegistrationFromReferenceId(
          referenceId,
          ['user'],
        );

      // Delete all data for this registration
      await this.registrationDataRepository.delete({
        registrationId: registration.id,
      });
      if (registration.user) {
        await this.personAffectedAppDataRepository.delete({
          user: { id: registration.user.id },
        });
      }
      await this.twilioMessageRepository.delete({
        registrationId: registration.id,
      });
      await this.whatsappPendingMessageRepository.delete({
        registrationId: registration.id,
      });
      await this.tryWhatsappRepository.delete({
        registrationId: registration.id,
      });

      // anonymize some data for this registration
      registration.phoneNumber = null;
      await this.registrationRepository.save(registration);

      // FSP-specific
      // intersolve-voucher
      const voucherImages = await this.imageCodeExportVouchersRepo.find({
        where: { registrationId: registration.id },
        relations: ['voucher'],
      });
      const vouchersToUpdate = [];
      for await (const voucherImage of voucherImages) {
        const voucher = await this.intersolveVoucherRepo.findOne({
          where: { id: voucherImage.voucher.id },
        });
        voucher.whatsappPhoneNumber = null;
        vouchersToUpdate.push(voucher);
      }
      await this.intersolveVoucherRepo.save(vouchersToUpdate);
      //safaricom
      const safaricomRequests = await this.safaricomRequestRepo.find({
        where: { transaction: { registration: { id: registration.id } } },
        relations: ['transaction', 'transaction.registration'],
      });
      const requestsToUpdate = [];
      for (const request of safaricomRequests) {
        request.requestResult = JSON.parse(
          JSON.stringify(request.requestResult).replace(request.partyB, ''),
        );
        request.paymentResult = JSON.parse(
          JSON.stringify(request.paymentResult).replace(request.partyB, ''),
        );
        request.transaction.customData = JSON.parse(
          JSON.stringify(request.transaction.customData).replace(
            request.partyB,
            '',
          ),
        );
        request.partyB = '';
        requestsToUpdate.push(request);
      }
      await this.safaricomRequestRepo.save(requestsToUpdate);
      // TODO: at_notification + belcash_request
    }
  }

  private async sendCustomTextMessage(
    referenceIds: string[],
    message: string,
  ): Promise<void> {
    const validRegistrations: RegistrationEntity[] = [];
    for (const referenceId of referenceIds) {
      const registration =
        await this.registrationsService.getRegistrationFromReferenceId(
          referenceId,
          ['program'],
        );
      validRegistrations.push(registration);
    }
    for (const validRegistration of validRegistrations) {
      await this.messageService.sendTextMessage(
        validRegistration,
        validRegistration.program.id,
        message,
        null,
        null,
        MessageContentType.custom,
      );
    }
  }

  private getAllowedCurrentStatusesForNewStatus(
    newStatus: RegistrationStatusEnum,
  ): RegistrationStatusEnum[] {
    const allStatuses = Object.values(RegistrationStatusEnum);
    return allStatuses.filter((currentStatus) =>
      this.registrationsService.canChangeStatus(currentStatus, newStatus),
    );
  }

  private async checkAllowedStatusChangeOrThrow(
    referenceIds: string[],
    registrationStatus: RegistrationStatusEnum,
  ): Promise<void> {
    const errors = [];
    for (const referenceId of referenceIds) {
      const registrationToUpdate = await this.registrationRepository.findOne({
        where: { referenceId: referenceId },
      });
      if (!registrationToUpdate) {
        errors.push(`Registration '${referenceId}' is not found`);
      } else if (
        !this.registrationsService.canChangeStatus(
          registrationToUpdate.registrationStatus,
          registrationStatus,
        )
      ) {
        errors.push(
          `Registration '${referenceId}' has status '${registrationToUpdate.registrationStatus}' which cannot be changed to ${registrationStatus}`,
        );
      }
    }
    if (errors.length > 0) {
      throw new HttpException({ errors }, HttpStatus.NOT_FOUND);
    }
  }
}