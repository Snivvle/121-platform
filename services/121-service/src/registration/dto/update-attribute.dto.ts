import { ApiProperty } from '@nestjs/swagger';
import { Length } from 'class-validator';
import { CustomDataAttributes } from '../enum/custom-data-attributes';
import { IsRegistrationDataValidType } from '../validator/registration-data-type.validator';

export enum AdditionalAttributes {
  paymentAmountMultiplier = 'paymentAmountMultiplier',
  preferredLanguage = 'preferredLanguage',
  maxPayments = 'maxPayments',
}
export const Attributes = { ...AdditionalAttributes, ...CustomDataAttributes };
export type Attributes = AdditionalAttributes | CustomDataAttributes;

const attributesArray = Object.values(Attributes).map((item) => String(item));

export class UpdateAttributeDto {
  @ApiProperty({ example: '910c50be-f131-4b53-b06b-6506a40a2734' })
  @Length(5, 200)
  public readonly referenceId: string;
  @ApiProperty({
    enum: attributesArray,
    example: attributesArray.join(' | '),
  })
  public readonly attribute: Attributes | string;
  @ApiProperty({ example: 'new value' })
  @IsRegistrationDataValidType({
    referenceId: 'referenceId',
    attribute: 'attribute',
  })
  public readonly value: string | number | string[];
}
