import { IsOptional, IsString } from 'class-validator';
import { ApiModelProperty } from '@nestjs/swagger';

export class SearchRegistrationDto {
  @ApiModelProperty({ example: '31600000000' })
  @IsString()
  @IsOptional()
  public readonly phoneNumber: string;
  @ApiModelProperty({ example: 'name' })
  @IsString()
  @IsOptional()
  public readonly name: string;
}
