import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attribute } from '../registration/enum/custom-data-attributes';
import { FspAttributeDto, UpdateFspDto } from './dto/update-fsp.dto';
import { FinancialServiceProviderEntity } from './financial-service-provider.entity';
import { FspQuestionEntity } from './fsp-question.entity';

@Injectable()
export class FspService {
  @InjectRepository(FinancialServiceProviderEntity)
  private financialServiceProviderRepository: Repository<
    FinancialServiceProviderEntity
  >;
  @InjectRepository(FspQuestionEntity)
  public fspAttributeRepository: Repository<FspQuestionEntity>;

  public constructor() {}

  public async getFspById(id: number): Promise<FinancialServiceProviderEntity> {
    const fsp = await this.financialServiceProviderRepository.findOne({
      where: { id: id },
      relations: ['questions'],
    });
    if (fsp) {
      fsp.editableAttributes = await this.getPaEditableAttributesFsp(fsp.id);
    }
    return fsp;
  }

  private async getPaEditableAttributesFsp(fspId): Promise<Attribute[]> {
    return (
      await this.fspAttributeRepository.find({
        where: { fspId: fspId },
      })
    ).map(c => {
      return {
        name: c.name,
        type: c.answerType,
        label: c.label,
        shortLabel: c.shortLabel,
        options: c.options,
      };
    });
  }

  public async updateFsp(
    updateFspDto: UpdateFspDto,
  ): Promise<FinancialServiceProviderEntity> {
    const fsp = await this.financialServiceProviderRepository.findOne({
      where: { fsp: updateFspDto.fsp },
    });
    if (!fsp) {
      const errors = `No fsp found with name ${updateFspDto.fsp}`;
      throw new HttpException({ errors }, HttpStatus.NOT_FOUND);
    }

    for (let key in updateFspDto) {
      if (key !== 'fsp') {
        fsp[key] = updateFspDto[key];
      }
    }

    await this.financialServiceProviderRepository.save(fsp);
    return fsp;
  }

  public async updateFspAttribute(
    fspAttributeDto: FspAttributeDto,
  ): Promise<FspQuestionEntity> {
    const fspAttributes = await this.fspAttributeRepository.find({
      where: { name: fspAttributeDto.name },
      relations: ['fsp'],
    });
    // Filter out the right fsp, if fsp-attribute name occurs across multiple fsp's
    const fspAttribute = fspAttributes.filter(
      a => a.fsp.fsp === fspAttributeDto.fsp,
    )[0];
    if (!fspAttribute) {
      const errors = `No fspAttribute found with name ${fspAttributeDto.name} in fsp with name ${fspAttributeDto.fsp}`;
      throw new HttpException({ errors }, HttpStatus.NOT_FOUND);
    }

    for (let key in fspAttributeDto) {
      if (key !== 'name' && key !== 'fsp') {
        fspAttribute[key] = fspAttributeDto[key];
      }
    }

    await this.fspAttributeRepository.save(fspAttribute);
    return fspAttribute;
  }

  public async createFspAttribute(
    fspAttributeDto: FspAttributeDto,
  ): Promise<FspQuestionEntity> {
    const fspAttributes = await this.fspAttributeRepository.find({
      where: { name: fspAttributeDto.name },
      relations: ['fsp'],
    });

    const fsp = await this.financialServiceProviderRepository.findOne({
      where: { fsp: fspAttributeDto.fsp },
    });
    if (!fsp) {
      const errors = `Fsp with name: '${fspAttributeDto.name}' not found.'`;
      throw new HttpException({ errors }, HttpStatus.NOT_FOUND);
    }
    // Filter out the right fsp, if fsp-attribute name occurs across multiple fsp's
    const oldFspAttribute = fspAttributes.filter(
      a => a.fsp.fsp === fspAttributeDto.fsp,
    )[0];
    if (oldFspAttribute) {
      const errors = `FspAttribute already found! Attribute exists with name ${fspAttributeDto.name} in fsp with name ${fspAttributeDto.fsp}`;
      throw new HttpException({ errors }, HttpStatus.NOT_FOUND);
    }
    const fspAttribute = new FspQuestionEntity();
    for (let key in fspAttributeDto) {
      if (key !== 'fsp') {
        fspAttribute[key] = fspAttributeDto[key];
      }
    }
    fspAttribute.fsp = fsp;
    await this.fspAttributeRepository.save(fspAttribute);
    return fspAttribute;
  }

  public async deleteFspAttribute(
    fspAttributeId: number,
  ): Promise<FspQuestionEntity> {
    const fspAttribute = await this.fspAttributeRepository.findOne({
      where: { id: Number(fspAttributeId) },
    });
    if (!fspAttribute) {
      const errors = `Fsp with id: '${fspAttributeId}' not found.'`;
      throw new HttpException({ errors }, HttpStatus.NOT_FOUND);
    }
    return await this.fspAttributeRepository.remove(fspAttribute);
  }
}
