import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
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
import { Permissions } from '../../../guards/permissions.decorator';
import { PermissionsGuard } from '../../../guards/permissions.guard';
import { PermissionEnum } from '../../../user/permission.enum';
import { RegistrationChangeLogService } from './registration-change-log.service';

@UseGuards(PermissionsGuard)
@ApiTags('registration-change-log')
@Controller()
export class RegistrationChangeLogController {
  public constructor(
    private registrationChangeLogService: RegistrationChangeLogService,
  ) {}

  // NOTE: REFACTOR: rename endpoint to /api/programs/:programid/registration-changes with OPTIONAL referenceID query param (OR: only rename AND add endpoint /api/programs/:programid/registration/:registrationid/changes)
  @Permissions(PermissionEnum.RegistrationPersonalREAD)
  @ApiOperation({ summary: 'Get changelog for registration' })
  @ApiResponse({ status: 200, description: 'Get changelog for registration' })
  @ApiParam({ name: 'programId', required: true, type: 'integer' })
  @ApiQuery({ name: 'referenceId', required: true, type: 'string' })
  @Get('programs/:programId/registration-change-logs')
  public async getChangeLog(
    @Param() params,
    @Query() queryParams,
  ): Promise<any> {
    if (!queryParams.referenceId) {
      throw new HttpException(
        'ReferenceId is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.registrationChangeLogService.getChangeLogByReferenceId(
      queryParams.referenceId,
      Number(params.programId),
    );
  }
}