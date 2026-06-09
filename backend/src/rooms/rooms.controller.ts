import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { UserRequest } from '../users/interfaces/user-request.interface';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateRoomMessageDto } from './dto/create-room-message.dto';
import { ReadyRoomDto } from './dto/ready-room.dto';
import { RoomsService } from './rooms.service';

@ApiTags('rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @ApiOperation({ summary: 'ルーム一覧を取得' })
  @ApiResponse({ status: 200, description: '成功時' })
  findAll(@Query('status') status?: string) {
    return this.roomsService.findAll(status);
  }

  @Post()
  @ApiOperation({ summary: 'ルームを作成' })
  @ApiResponse({ status: 201, description: '成功時' })
  create(@Request() req: UserRequest, @Body() dto: CreateRoomDto) {
    return this.roomsService.create(req.user.userId, dto);
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'ルーム情報を取得' })
  @ApiResponse({ status: 200, description: '成功時' })
  findOne(@Param('roomId') roomId: string) {
    return this.roomsService.findOne(roomId);
  }

  @Post(':roomId/join')
  @ApiOperation({ summary: 'ルームに参加' })
  @ApiResponse({ status: 201, description: '成功時' })
  join(@Request() req: UserRequest, @Param('roomId') roomId: string) {
    return this.roomsService.join(roomId, req.user.userId);
  }

  @Post(':roomId/leave')
  @ApiOperation({ summary: 'ルームから退出' })
  @ApiResponse({ status: 201, description: '成功時' })
  leave(@Request() req: UserRequest, @Param('roomId') roomId: string) {
    return this.roomsService.leave(roomId, req.user.userId);
  }

  @Post(':roomId/ready')
  @ApiOperation({ summary: 'Ready状態を変更' })
  @ApiResponse({ status: 201, description: '成功時' })
  setReady(
    @Request() req: UserRequest,
    @Param('roomId') roomId: string,
    @Body() dto: ReadyRoomDto,
  ) {
    return this.roomsService.setReady(roomId, req.user.userId, dto.isReady);
  }

  @Post(':roomId/start')
  @ApiOperation({ summary: '試合を開始' })
  @ApiResponse({ status: 201, description: '成功時' })
  start(@Request() req: UserRequest, @Param('roomId') roomId: string) {
    return this.roomsService.start(roomId, req.user.userId);
  }

  @Get(':roomId/messages')
  @ApiOperation({ summary: 'チャットメッセージを取得' })
  @ApiResponse({ status: 200, description: '成功時' })
  findMessages(@Request() req: UserRequest, @Param('roomId') roomId: string) {
    return this.roomsService.findMessages(roomId, req.user.userId);
  }

  @Post(':roomId/messages')
  @ApiOperation({ summary: 'チャットメッセージを送信' })
  @ApiResponse({ status: 201, description: '成功時' })
  createMessage(
    @Request() req: UserRequest,
    @Param('roomId') roomId: string,
    @Body() dto: CreateRoomMessageDto,
  ) {
    return this.roomsService.createMessage(roomId, req.user.userId, dto);
  }
}
