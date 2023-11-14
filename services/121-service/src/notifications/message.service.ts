import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProgramEntity } from '../programs/program.entity';
import {
  MessageContentType,
  ReplacedByGenericTemplateMessageTypes,
} from './enum/message-type.enum';
import { SmsService } from './sms/sms.service';
import { TryWhatsappEntity } from './whatsapp/try-whatsapp.entity';
import { WhatsappService } from './whatsapp/whatsapp.service';
import { MessageJobDto } from './message-job.dto';
import { RegistrationEntity } from '../registration/registration.entity';
import { IntersolveVoucherPayoutStatus } from '../payments/fsp-integration/intersolve-voucher/enum/intersolve-voucher-payout-status.enum';
import { WhatsappPendingMessageEntity } from './whatsapp/whatsapp-pending-message.entity';
import { ProgramNotificationEnum } from './enum/program-notification.enum';
import { IntersolveVoucherService } from '../payments/fsp-integration/intersolve-voucher/intersolve-voucher.service';
import { StatusEnum } from '../shared/enum/status.enum';
import { QueueMessageService } from './queue-message/queue-message.service';

@Injectable()
export class MessageService {
  @InjectRepository(TryWhatsappEntity)
  private readonly tryWhatsappRepository: Repository<TryWhatsappEntity>;
  @InjectRepository(RegistrationEntity)
  private readonly registrationRepository: Repository<RegistrationEntity>;
  @InjectRepository(WhatsappPendingMessageEntity)
  private readonly whatsappPendingMessageRepo: Repository<WhatsappPendingMessageEntity>;

  private readonly fallbackLanguage = 'en';

  public constructor(
    private readonly whatsappService: WhatsappService,
    private readonly smsService: SmsService,
    private readonly dataSource: DataSource,
    private readonly intersolveVoucherService: IntersolveVoucherService,
    private readonly queueMessageService: QueueMessageService,
  ) {}

  public async sendTextMessage(messageJobDto: MessageJobDto): Promise<void> {
    // TODO: this was not being followed e.g. for payment-instructions. Can we just remove it?
    // if (!messageJobDto.message && !messageJobDto.key) {
    //   throw new HttpException(
    //     'A message or a key should be supplied.',
    //     HttpStatus.BAD_REQUEST,
    //   );
    // }
    try {
      const messageText = messageJobDto.message
        ? messageJobDto.message
        : await this.getNotificationText(
            messageJobDto.preferredLanguage,
            messageJobDto.key,
            messageJobDto.programId,
          );

      const whatsappNumber = messageJobDto.whatsappPhoneNumber;
      if (whatsappNumber) {
        if (
          ReplacedByGenericTemplateMessageTypes.includes(
            messageJobDto.messageContentType,
          )
        ) {
          await this.storePendingMessageAndSendTemplate(
            messageText,
            whatsappNumber,
            null,
            null,
            messageJobDto.id,
            messageJobDto.messageContentType,
          );
        } else {
          let messageSid: string;
          let errorMessage: any;
          await this.whatsappService
            .sendWhatsapp(
              messageJobDto.message,
              messageJobDto.phoneNumber,
              null,
              messageJobDto.mediaUrl,
              messageJobDto.id,
              messageJobDto.messageContentType,
              // TODO: Add messageSid to update existing message
              null,
            )
            .then(
              (response) => {
                messageSid = response;
                return;
              },
              (error) => {
                if (
                  (messageJobDto.messageContentType =
                    MessageContentType.paymentTemplated)
                ) {
                  errorMessage = error;
                } else {
                  throw error;
                }
              },
            );
          if (
            [
              MessageContentType.paymentTemplated,
              MessageContentType.payment,
            ].includes(messageJobDto.messageContentType)
          ) {
            await this.intersolveVoucherService.storeTransactionResult(
              messageJobDto.customData.payment,
              messageJobDto.customData.amount,
              messageJobDto.id,
              messageJobDto.messageContentType ===
                MessageContentType.paymentTemplated
                ? 1
                : 2,
              messageJobDto.messageContentType === MessageContentType.payment
                ? StatusEnum.success
                : messageSid
                ? StatusEnum.waiting
                : StatusEnum.error,
              errorMessage,
              messageJobDto.programId,
              messageSid,
              messageJobDto.customData.intersolveVoucherId,
            );
          }
        }
      } else if (messageJobDto.tryWhatsApp && messageJobDto.phoneNumber) {
        await this.tryWhatsapp(
          messageJobDto,
          messageText,
          messageJobDto.messageContentType,
        );
      } else if (messageJobDto.phoneNumber) {
        await this.smsService.sendSms(
          messageText,
          messageJobDto.phoneNumber,
          messageJobDto.id,
          messageJobDto.messageContentType,
        );
      } else {
        throw new HttpException(
          'A recipientPhoneNr should be supplied.',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      console.log('error: ', error);
      throw error;
    }
  }

  private async storePendingMessageAndSendTemplate(
    message: string,
    recipientPhoneNr: string,
    messageType: null | IntersolveVoucherPayoutStatus,
    mediaUrl: null | string,
    registrationId: number,
    messageContentType: MessageContentType,
  ): Promise<void> {
    const pendingMesssage = new WhatsappPendingMessageEntity();
    pendingMesssage.body = message;
    pendingMesssage.to = recipientPhoneNr;
    pendingMesssage.mediaUrl = mediaUrl;
    pendingMesssage.messageType = messageType;
    pendingMesssage.registrationId = registrationId;
    pendingMesssage.contentType = messageContentType;
    await this.whatsappPendingMessageRepo.save(pendingMesssage);

    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId },
      relations: ['program'],
    });
    const language = registration.preferredLanguage || this.fallbackLanguage;
    const whatsappGenericMessage = await this.getNotificationText(
      language,
      ProgramNotificationEnum.whatsappGenericMessage,
      registration.program.id,
    );
    await this.queueMessageService.addMessageToQueue(
      registration,
      registration.programId,
      whatsappGenericMessage,
      null,
      false,
      MessageContentType.genericTemplated,
      null,
    );
  }

  private async getNotificationText(
    language: string,
    key: string,
    programId: number,
  ): Promise<string> {
    const program = await this.dataSource
      .getRepository(ProgramEntity)
      .findOneBy({
        id: programId,
      });
    const fallbackNotifications = program.notifications[this.fallbackLanguage];
    let notifications = fallbackNotifications;

    if (program.notifications[language]) {
      notifications = program.notifications[language];
    }
    if (notifications[key]) {
      return notifications[key];
    }
    return fallbackNotifications[key] ? fallbackNotifications[key] : '';
  }

  private async tryWhatsapp(
    messageJobDto: MessageJobDto,
    messageText,
    messageContentType?: MessageContentType,
  ): Promise<void> {
    await this.storePendingMessageAndSendTemplate(
      messageText,
      messageJobDto.phoneNumber,
      null,
      null,
      messageJobDto.id,
      messageContentType,
    );
    const tryWhatsapp = {
      sid: 'SM1234567890', //  TODO: make dynamic + move result handling to processor
      registrationId: messageJobDto.id,
    };
    await this.tryWhatsappRepository.save(tryWhatsapp);
  }
}
