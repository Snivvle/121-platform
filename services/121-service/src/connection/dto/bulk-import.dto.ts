import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { ApiModelProperty } from '@nestjs/swagger';
import { fspName } from '../../programs/fsp/financial-service-provider.entity';

export class BulkImportDto {
  @ApiModelProperty()
  @IsNotEmpty()
  @IsString()
  public phoneNumber: string;

  @ApiModelProperty()
  @IsNotEmpty()
  @IsString()
  public namePartnerOrganization: string;

  @ApiModelProperty()
  @IsNumber()
  @IsInt()
  @Min(1)
  public paymentAmountMultiplier: number;
}

export class ImportResult {
  public countImported: number;
  public countExistingPhoneNr: number;
  public countInvalidPhoneNr: number;
}

const fspArray = Object.values(fspName).map(item => String(item));

export class ImportTestRegistrationsDto {
  @ApiModelProperty({ default: 'en' })
  @IsNotEmpty()
  @IsString()
  @IsIn(['en', 'tl', 'ar'])
  public preferredLanguage: string;

  @ApiModelProperty()
  @IsString()
  public namePartnerOrganization: string;

  @ApiModelProperty()
  @IsNotEmpty()
  @IsString()
  public nameFirst: string;

  @ApiModelProperty()
  @IsNotEmpty()
  @IsString()
  public nameLast: string;

  @ApiModelProperty()
  @IsNotEmpty()
  @IsString()
  public phoneNumber: string;

  @ApiModelProperty({
    enum: fspArray,
    example: fspArray.join(' | '),
  })
  @IsIn(fspArray)
  public fspName: fspName;

  @ApiModelProperty()
  @IsString()
  public whatsappPhoneNumber: string;
}