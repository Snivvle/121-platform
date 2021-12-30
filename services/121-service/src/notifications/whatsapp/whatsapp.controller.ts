import { WhatsappService } from './whatsapp.service';
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import {
  ApiResponse,
  ApiUseTags,
  ApiImplicitParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { UserRole } from '../../user-role.enum';
import { Roles } from '../../roles.decorator';
import {
  TwilioStatusCallbackDto,
  TwilioIncomingCallbackDto,
} from '../twilio.dto';
import { RegistrationStatusEnum } from '../../registration/enum/registration-status.enum';

@ApiUseTags('notifications')
@Controller('notifications/whatsapp')
export class WhatsappController {
  private readonly whatsappService: WhatsappService;
  public constructor(whatsappService: WhatsappService) {
    this.whatsappService = whatsappService;
  }

  @Roles(UserRole.Admin)
  @ApiResponse({
    status: 200,
    description: 'Test controller to test sending whatsapp',
  })
  @ApiImplicitParam({ name: 'number' })
  @Get(':number')
  public async sendWhatsapp(@Param() params): Promise<void> {
    return await this.whatsappService.sendWhatsapp(
      'Test whatsapp',
      params.number,
      null,
      null,
      null,
    );
  }

  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @Post('status')
  public async statusCallback(
    @Body() callbackData: TwilioStatusCallbackDto,
  ): Promise<void> {
    return await this.whatsappService.statusCallback(callbackData);
  }

  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @Post('incoming')
  public async incoming(
    @Body() callbackData: TwilioIncomingCallbackDto,
  ): Promise<void> {
    return await this.whatsappService.handleIncoming(callbackData);
  }
}
