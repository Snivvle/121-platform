import { LookupService } from './../../notifications/lookup/lookup.service';
import { CredentialIssueDto } from './dto/credential-issue.dto';
import {
  Injectable,
  HttpException,
  Inject,
  forwardRef,
  HttpStatus,
  HttpService,
} from '@nestjs/common';
import { ProgramEntity } from '../../programs/program/program.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult, getRepository } from 'typeorm';
import { ProgramService } from '../../programs/program/program.service';
import { PrefilledAnswerDto } from './dto/prefilled-answers.dto';
import { CredentialAttributesEntity } from './credential-attributes.entity';
import { ConnectionEntity } from '../create-connection/connection.entity';
import { UserEntity } from '../../user/user.entity';
import { DownloadData } from './interfaces/download-data.interface';
import {
  FspAnswersAttrInterface,
  AnswerSet,
} from '../../programs/fsp/fsp-interface';
import { FspAttributeEntity } from '../../programs/fsp/fsp-attribute.entity';
import { API } from '../../config';

@Injectable()
export class CredentialService {
  @InjectRepository(ProgramEntity)
  private readonly programRepository: Repository<ProgramEntity>;
  @InjectRepository(CredentialAttributesEntity)
  private readonly credentialAttributesRepository: Repository<
    CredentialAttributesEntity
  >;
  @InjectRepository(ConnectionEntity)
  private readonly connectionRepository: Repository<ConnectionEntity>;
  @InjectRepository(FspAttributeEntity)
  private readonly fspAttributeRepository: Repository<FspAttributeEntity>;
  @InjectRepository(UserEntity)
  private readonly userRepository: Repository<UserEntity>;

  public constructor(
    @Inject(forwardRef(() => ProgramService))
    private readonly programService: ProgramService,
    private readonly httpService: HttpService,
    private readonly lookupService: LookupService,
  ) {}

  // PA: get attributes based on programId
  public async getAttributes(programId: number): Promise<any[]> {
    let selectedProgram = await this.programService.findOne(programId);
    let attributes = [];
    if (selectedProgram) {
      for (let criterium of selectedProgram.customCriteria) {
        attributes.push(criterium);
      }
    } else {
      const errors = 'Program does not exist or is not published';
      throw new HttpException({ errors }, HttpStatus.UNAUTHORIZED);
    }
    return attributes;
  }

  // PA: post answers to attributes
  public async prefilledAnswers(
    did: string,
    programId: number,
    prefilledAnswersRaw: PrefilledAnswerDto[],
  ): Promise<any[]> {
    //Then save new information
    const prefilledAnswers = await this.cleanAnswers(
      prefilledAnswersRaw,
      programId,
    );
    let credentials = [];
    for (let answer of prefilledAnswers) {
      const oldAttribute = await this.credentialAttributesRepository.findOne({
        where: { did: did, programId: programId, attribute: answer.attribute },
      });
      if (!oldAttribute) {
        let credential = new CredentialAttributesEntity();
        credential.did = did;
        credential.attributeId = answer.attributeId;
        credential.attribute = answer.attribute;
        credential.answer = answer.answer;
        let newCredential;
        credential.programId = programId;

        newCredential = await this.credentialAttributesRepository.save(
          credential,
        );
        credentials.push(newCredential);
      }
    }

    const connection = await this.connectionRepository.findOne({
      where: { did: did },
    });
    if (
      !connection.customData ||
      Object.keys(connection.customData).length === 0
    ) {
      await this.storePersistentAnswers(prefilledAnswers, programId, did);
    }
    return credentials;
  }

  public async cleanAnswers(
    answers: PrefilledAnswerDto[],
    programId: number,
  ): Promise<PrefilledAnswerDto[]> {
    const answerTypeTel = 'tel';
    const program = await this.programService.findOne(programId);
    const phonenumberTypedAnswers = [];
    for (let criterium of program.customCriteria) {
      if (criterium.answerType == answerTypeTel) {
        phonenumberTypedAnswers.push(criterium.criterium);
      }
    }
    const fspTelAttributes = await this.fspAttributeRepository.find({
      where: { answerType: answerTypeTel },
    });
    for (let fspAttr of fspTelAttributes) {
      phonenumberTypedAnswers.push(fspAttr.name);
    }

    const cleanedAnswers = [];
    for (let answer of answers) {
      if (phonenumberTypedAnswers.includes(answer.attribute)) {
        answer.answer = await this.lookupService.lookupAndCorrect(
          answer.answer,
        );
      }
      cleanedAnswers.push(answer);
    }
    return cleanedAnswers;
  }

  public async storePersistentAnswers(
    answersRaw,
    programId,
    did,
  ): Promise<void> {
    const answers = await this.cleanAnswers(answersRaw, programId);
    let program = await this.programRepository.findOne(programId, {
      relations: ['customCriteria'],
    });
    const persistentCriteria = [];
    for (let criterium of program.customCriteria) {
      if (criterium.persistence) {
        persistentCriteria.push(criterium.criterium);
      }
    }
    const customDataToStore = {};
    for (let answer of answers) {
      if (persistentCriteria.includes(answer.attribute)) {
        customDataToStore[answer.attribute] = answer.answer;
      }
    }
    let connection = await this.connectionRepository.findOne({
      where: { did: did },
    });
    connection.customData = JSON.parse(JSON.stringify(customDataToStore));
    await this.connectionRepository.save(connection);
  }

  // AW: get answers to attributes for a given PA (identified first through did/QR)
  public async getPrefilledAnswers(
    did: string,
    programId: number,
  ): Promise<CredentialAttributesEntity[]> {
    let credentials;
    credentials = await this.credentialAttributesRepository.find({
      where: { did: did, programId: programId },
    });
    return credentials;
  }

  public async downloadData(userId: number): Promise<DownloadData> {
    const user = await this.userRepository.findOne(userId, {
      relations: ['assignedProgram'],
    });
    if (!user || !user.assignedProgram || user.assignedProgram.length === 0) {
      const errors = 'User not found or no assigned programs';
      throw new HttpException({ errors }, HttpStatus.UNAUTHORIZED);
    }
    const data = {
      answers: await this.getAllPrefilledAnswers(user),
      fspData: await this.getAllFspAnswerData(),
      didQrMapping: await this.getQrDidMapping(),
    };
    return data;
  }

  public async getAllPrefilledAnswers(
    user: UserEntity,
  ): Promise<CredentialAttributesEntity[]> {
    const programIds = user.assignedProgram.map(program => {
      return { programId: program.id };
    });
    const answers = await this.credentialAttributesRepository.find({
      where: programIds,
    });
    return answers;
  }

  public async getAllFspAnswerData(): Promise<FspAnswersAttrInterface[]> {
    const connections = await getRepository(ConnectionEntity)
      .createQueryBuilder('connection')
      .leftJoinAndSelect('connection.fsp', 'fsp')
      .leftJoinAndSelect('fsp.attributes', ' fsp_attribute.fsp')
      .where('connection.fsp IS NOT NULL')
      .andWhere('connection.validationDate IS NULL') // Filter to only download data for PA's not validated yet
      .getMany();

    const fspDataPerConnection = [];
    for (const connection of connections) {
      const answers = this.getFspAnswers(
        connection.fsp.attributes,
        connection.customData,
      );
      const fspData = {
        attributes: connection.fsp.attributes,
        answers: answers,
        did: connection.did,
      };
      fspDataPerConnection.push(fspData);
    }
    return fspDataPerConnection;
  }

  public getFspAnswers(
    fspAttributes: FspAttributeEntity[],
    customData: JSON,
  ): AnswerSet {
    const fspAttributeNames = [];
    for (const attribute of fspAttributes) {
      fspAttributeNames.push(attribute.name);
    }
    const fspCustomData = {};
    for (const key in customData) {
      if (fspAttributeNames.includes(key)) {
        fspCustomData[key] = {
          code: key,
          value: customData[key],
        };
      }
    }
    return fspCustomData;
  }

  public async getQrDidMapping(): Promise<ConnectionEntity[]> {
    return await this.connectionRepository
      .createQueryBuilder('connection')
      .select(['connection.qrIdentifier', 'connection.did'])
      .where('connection.validationDate IS NULL') // Filter to only download data for PA's not validated yet
      .getMany();
  }

  // AW: delete answers to attributes for a given PA after issuing credentials (identified first through did/QR)
  public async deletePrefilledAnswers(
    did: string,
    programId: number,
  ): Promise<DeleteResult> {
    return await this.credentialAttributesRepository.delete({
      did: did,
      programId: programId,
    });
  }

  // Used by Aidworker
  public async issue(payload: CredentialIssueDto): Promise<void> {
    await this.storePersistentAnswers(
      payload.attributes,
      payload.programId,
      payload.did,
    );

    await this.updateConnectionStatus(payload.did);
  }

  private async updateConnectionStatus(did): Promise<void> {
    let connection = await this.connectionRepository.findOne({
      where: { did: did },
    });
    connection.validationDate = new Date();
    await this.connectionRepository.save(connection);
  }
}
