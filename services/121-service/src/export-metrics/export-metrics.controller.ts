import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from '../guards/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';
import { ReferenceIdsDto } from '../registration/dto/reference-id.dto';
import { PermissionEnum } from '../user/permission.enum';
import { User } from '../user/user.decorator';
import { Admin } from './../guards/admin.decorator';
import { ExportDetailsDto } from './dto/export-details.dto';
import { ProgramMetrics } from './dto/program-metrics.dto';
import { ProgramStats } from './dto/program-stats.dto';
import { TotalTransferAmounts } from './dto/total-transfer-amounts.dto';
import { ExportMetricsService } from './export-metrics.service';

@UseGuards(PermissionsGuard)
@ApiTags('export-metrics')
@Controller()
export class ExportMetricsController {
  private readonly exportMetricsService: ExportMetricsService;
  public constructor(exportMetricsService: ExportMetricsService) {
    this.exportMetricsService = exportMetricsService;
  }
  @Permissions(PermissionEnum.RegistrationPersonalEXPORT)
  @ApiOperation({
    summary: 'Get an exported list of people',
  })
  @ApiResponse({
    status: 201,
    description: 'List of people exported',
  })
  @ApiParam({
    name: 'programId',
    required: true,
    type: 'integer',
  })
  @Post('programs/:programId/export-metrics/export-list')
  public async getExportList(
    @Body() data: ExportDetailsDto,
    @Param('programId') programId,
    @User('id') userId: number,
  ): Promise<any> {
    return await this.exportMetricsService.getExportList(
      Number(programId),
      data.type,
      userId,
      data.minPayment,
      data.maxPayment,
    );
  }

  @Admin()
  @ApiOperation({
    summary: 'Get list of to cancel vouchers only used by admin',
  })
  @ApiResponse({
    status: 201,
    description: 'Get list of to cancel vouchers only used by admin',
  })
  @Post('export-metrics/to-cancel-vouchers')
  public async getToCancelVouchers(): Promise<any> {
    return await this.exportMetricsService.getToCancelVouchers();
  }

  @Permissions(PermissionEnum.ProgramMetricsREAD)
  @ApiOperation({ summary: 'Get metrics by program-id' })
  @ApiParam({
    name: 'programId',
    required: true,
    type: 'integer',
  })
  @ApiQuery({
    name: 'payment',
    required: false,
    type: 'integer',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    type: 'integer',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: 'integer',
  })
  @ApiQuery({
    name: 'fromStart',
    required: false,
    type: 'integer',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics of a program to gain an overview of the program ',
  })
  @Get('programs/:programId/export-metrics/person-affected')
  public async getPAMetrics(
    @Param() params,
    @Query() query,
  ): Promise<ProgramMetrics> {
    return {
      pa: await this.exportMetricsService.getPaMetrics(
        Number(params.programId),
        query.payment ? Number(query.payment) : undefined,
        query.month ? Number(query.month) : undefined,
        query.year ? Number(query.year) : undefined,
        query.fromStart ? Number(query.fromStart) : undefined,
      ),
      updated: new Date(),
    };
  }

  @Permissions(PermissionEnum.ProgramMetricsREAD)
  @ApiOperation({ summary: 'Get payments with state sums by program-id' })
  @ApiParam({
    name: 'programId',
    required: true,
    type: 'integer',
  })
  @ApiResponse({
    status: 200,
    description:
      'Payment state sums to create bar charts to show the number of new vs existing PAs per installmet',
  })
  @Get('programs/:programId/export-metrics/payment-state-sums')
  public async getPaymentsWithStateSums(@Param() params): Promise<any> {
    return await this.exportMetricsService.getPaymentsWithStateSums(
      Number(params.programId),
    );
  }

  @Permissions(PermissionEnum.ProgramMetricsREAD)
  @ApiOperation({ summary: 'Get monitoring data' })
  @ApiResponse({
    status: 200,
    description: 'All monitoring data of a program',
  })
  @ApiParam({ name: 'programId', required: true, type: 'integer' })
  @Get('programs/:programId/export-metrics/monitoring')
  public async getMonitoringData(@Param() params): Promise<any[]> {
    return await this.exportMetricsService.getMonitoringData(
      Number(params.programId),
    );
  }

  @Permissions(PermissionEnum.ProgramMetricsREAD)
  @ApiOperation({
    summary: 'Get total transfer amounts of people to pay out',
  })
  @ApiParam({ name: 'programId', required: true, type: 'integer' })
  @ApiResponse({
    status: 201,
    description: 'Total number of included per program',
  })
  @Post('programs/:programId/export-metrics/total-transfer-amounts')
  public async getTotalTransferAmounts(
    @Param() params,
    @Body() referenceIdsDto: ReferenceIdsDto,
  ): Promise<TotalTransferAmounts> {
    return await this.exportMetricsService.getTotalTransferAmounts(
      Number(params.programId),
      referenceIdsDto,
    );
  }

  @Permissions(PermissionEnum.ProgramMetricsREAD)
  @ApiOperation({ summary: 'Get program stats summary' })
  @ApiParam({ name: 'programId', required: true })
  @ApiResponse({
    status: 200,
    description: 'Program stats summary',
  })
  @Get('programs/:programId/export-metrics/program-stats-summary')
  public async getProgramStats(@Param() params): Promise<ProgramStats> {
    return await this.exportMetricsService.getProgramStats(
      Number(params.programId),
    );
  }
}
