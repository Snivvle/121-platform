import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Admin } from '../../../guards/admin.decorator';
import { AdminAuthGuard } from '../../../guards/admin.guard';
import { Permissions } from '../../../guards/permissions.decorator';
import { PermissionsGuard } from '../../../guards/permissions.guard';
import { PermissionEnum } from '../../../user/permission.enum';
import { CommercialBankEthiopiaService } from './commercial-bank-ethiopia.service';
import { CommercialBankEthiopiaValidationReportDto } from './dto/commercial-bank-ethiopia-validation-report.dto';

@UseGuards(PermissionsGuard, AdminAuthGuard)
@ApiTags('financial-service-providers/commercial-bank-ethiopia')
@Controller()
export class CommercialBankEthiopiaController {
  public constructor(
    private commercialBankEthiopiaService: CommercialBankEthiopiaService,
  ) {}

  @Permissions(PermissionEnum.PaymentFspInstructionREAD)
  @ApiOperation({
    summary: 'Returns a list of PAs with their validation status',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of PAs with their validation status',
    type: CommercialBankEthiopiaValidationReportDto,
  })
  @ApiParam({ name: 'programId', required: true, type: 'integer' })
  @Get(
    'programs/:programId/financial-service-providers/commercial-bank-ethiopia/account-enquiries',
  )
  public async getValidated(
    @Param('programId') programId: number,
  ): Promise<CommercialBankEthiopiaValidationReportDto> {
    return await this.commercialBankEthiopiaService.getAllPaValidations(
      Number(programId),
    );
  }

  @Admin()
  @ApiOperation({
    summary: 'Validate all persons affected that are in this program.',
  })
  @ApiResponse({
    status: 200,
    description: 'Done validating all persons affected in this program.',
  })
  @ApiParam({ name: 'programId', required: true, type: 'integer' })
  @Get(
    'programs/:programId/financial-service-providers/commercial-bank-ethiopia/account-enquiries/validate',
  )
  public async validate(@Param('programId') programId: number): Promise<void> {
    return this.commercialBankEthiopiaService.validatePasForProgram(
      Number(programId),
    );
  }
}