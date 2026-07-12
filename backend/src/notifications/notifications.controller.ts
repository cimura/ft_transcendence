import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { UserRequest } from '../users/interfaces/user-request.interface';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'アプリ内通知一覧を取得' })
  @ApiOkResponse({
    description: '成功時',
    type: NotificationResponseDto,
    isArray: true,
  })
  findAll(@Request() req: UserRequest): Promise<NotificationResponseDto[]> {
    return this.notificationsService.findAll(req.user.userId);
  }
}
