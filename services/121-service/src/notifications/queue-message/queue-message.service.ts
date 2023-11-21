import { Injectable } from '@nestjs/common';
import { MessageContentType } from '../enum/message-type.enum';
import {
  ExtendedMessageProccessType,
  MessageJobCustomDataDto,
  MessageJobDto,
  MessageProcessType,
  MessageProcessTypeExtension,
} from '../message-job.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { RegistrationEntity } from '../../registration/registration.entity';
import { CustomDataAttributes } from '../../registration/enum/custom-data-attributes';
import { RegistrationViewEntity } from '../../registration/registration-view.entity';
import { ProcessName } from '../enum/processor.names.enum';
import {
  DEFAULT_PRIORITY,
  MessagePriorityMap,
  SEND_MESSAGE_PRIORITY,
} from '../enum/send-message-priority.const';

@Injectable()
export class QueueMessageService {
  public constructor(
    @InjectQueue('message') private readonly messageQueue: Queue,
  ) {}

  public async addMessageToQueue(
    registration: RegistrationEntity | RegistrationViewEntity,
    message: string,
    key: string,
    messageContentType: MessageContentType,
    messageProcessType: ExtendedMessageProccessType,
    mediaUrl?: string,
    customData?: MessageJobCustomDataDto,
    bulksize?: number,
  ): Promise<void> {
    let whatsappPhoneNumber;
    if (registration instanceof RegistrationViewEntity) {
      whatsappPhoneNumber = registration['whatsappPhoneNumber'];
    } else if (registration instanceof RegistrationEntity) {
      whatsappPhoneNumber = await registration.getRegistrationDataValueByName(
        CustomDataAttributes.whatsappPhoneNumber,
      );
    }

    // If messageProcessType is smsOrWhatsappTemplateGeneric, check if registration has whatsappPhoneNumber
    if (
      messageProcessType ===
      MessageProcessTypeExtension.smsOrWhatsappTemplateGeneric
    ) {
      messageProcessType = whatsappPhoneNumber
        ? MessageProcessType.whatsappTemplateGeneric
        : MessageProcessType.sms;
    }

    const messageJob: MessageJobDto = {
      messageProcessType: messageProcessType,
      registrationId: registration.id,
      referenceId: registration.referenceId,
      preferredLanguage: registration.preferredLanguage,
      whatsappPhoneNumber: whatsappPhoneNumber,
      phoneNumber: registration.phoneNumber,
      programId: registration.programId,
      message,
      key,
      messageContentType,
      mediaUrl,
      customData,
    };
    const priority = this.getPriority(messageProcessType, bulksize);
    try {
      await this.messageQueue.add(ProcessName.send, messageJob, {
        priority: priority,
      });
    } catch (error) {
      console.warn('Error in addMessageToQueue: ', error);
    }
  }

  private getPriority(
    messageProccessType: MessageProcessType,
    bulkSize?: number,
  ): number {
    const mappingArray = SEND_MESSAGE_PRIORITY;

    const relevantMapping = mappingArray.find((map: MessagePriorityMap) => {
      return map.types.includes(messageProccessType);
    });

    // No mapping is found use default priority
    if (!relevantMapping) {
      console.warn(
        'No priority mapping found for message type: ',
        messageProccessType,
      );
      return DEFAULT_PRIORITY; // default priority
    }

    // If no bulkSize is provided, use default priority of mapping
    if (bulkSize == null) {
      return relevantMapping.priority;
    }

    // If bulkSize is provided, and bulkSizePriority is not set, use default priority of mapping and give warning
    if (!relevantMapping.bulkSizePriority) {
      console.warn(
        `No bulkSizePriority found for message type: ${messageProccessType} while bulk size is set to: ${bulkSize}. Using default priority of mapping.`,
      );
      return relevantMapping.priority; // default priority of mapping
    }

    // If bulkSize is provided, and bulkSizePriority set on the mapping use the bulk size priority mapping
    const bulkSizePriorities = relevantMapping.bulkSizePriority;
    for (const bulkSizePriorityItem of bulkSizePriorities) {
      if (bulkSize < bulkSizePriorityItem.bulkSize) {
        return bulkSizePriorityItem.priority;
      }
    }
  }
}
