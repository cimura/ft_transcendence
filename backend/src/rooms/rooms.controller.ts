import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
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
import { CreateRoomInvitationDto } from './dto/create-room-invitation.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateRoomMessageDto } from './dto/create-room-message.dto';
import { QueryRoomsDto } from './dto/query-rooms.dto';
import { ReadyRoomDto } from './dto/ready-room.dto';
import { RoomsService } from './rooms.service';
import { RoomsInvitationService } from './rooms-invitation.service';
import { RoomsChatService } from './rooms-chat.service';
import { RoomsGateway } from './rooms.gateway';

@ApiTags('rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly roomsInvitationService: RoomsInvitationService,
    private readonly roomsChatService: RoomsChatService,
    private readonly roomsGateway: RoomsGateway,
  ) {}

  @Get()
  @ApiOperation({ summary: 'ルーム一覧を取得' })
  @ApiResponse({ status: 200, description: '成功時' })
  findAll(@Query() query: QueryRoomsDto) {
    return this.roomsService.findAll(query.status);
  }

  @Post()
  @ApiOperation({ summary: 'ルームを作成' })
  @ApiResponse({ status: 201, description: '成功時' })
  async create(@Request() req: UserRequest, @Body() dto: CreateRoomDto) {
    const room = await this.roomsService.create(req.user.userId, dto);
    this.roomsGateway.emitRoomCreated(room);
    return room;
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
  async join(@Request() req: UserRequest, @Param('roomId') roomId: string) {
    const room = await this.roomsService.join(roomId, req.user.userId);
    this.roomsGateway.emitRoomUpdated(room);
    return room;
  }

  @Post(':roomId/invitations')
  @ApiOperation({ summary: 'ルームへの招待を作成' })
  @ApiResponse({ status: 201, description: '成功時' })
  createInvitation(
    @Request() req: UserRequest,
    @Param('roomId') roomId: string,
    @Body() dto: CreateRoomInvitationDto,
  ) {
    return this.roomsInvitationService.createInvitation(
      roomId,
      req.user.userId,
      dto,
    );
  }

  @Put('invitations/:invitationId/accept')
  @ApiOperation({ summary: 'ルーム招待を承認して参加' })
  @ApiResponse({ status: 200, description: '成功時' })
  async acceptInvitation(
    @Request() req: UserRequest,
    @Param('invitationId') invitationId: string,
  ) {
    const room = await this.roomsInvitationService.acceptInvitation(
      invitationId,
      req.user.userId,
    );
    this.roomsGateway.emitRoomUpdated(room);
    return room;
  }

  @Put('invitations/:invitationId/decline')
  @ApiOperation({ summary: 'ルーム招待を辞退' })
  @ApiResponse({ status: 200, description: '成功時' })
  declineInvitation(
    @Request() req: UserRequest,
    @Param('invitationId') invitationId: string,
  ) {
    return this.roomsInvitationService.declineInvitation(
      invitationId,
      req.user.userId,
    );
  }

  @Post(':roomId/leave')
  @ApiOperation({ summary: 'ルームから退出' })
  @ApiResponse({ status: 201, description: '成功時' })
  leave(@Request() req: UserRequest, @Param('roomId') roomId: string) {
    const result = this.roomsService.leave(roomId, req.user.userId);

    if ('id' in result) {
      this.roomsGateway.emitRoomUpdated(result);
    } else {
      this.roomsGateway.emitRoomDeleted(result.roomId);
    }

    return result;
  }

  @Post(':roomId/ready')
  @ApiOperation({ summary: 'Ready状態を変更' })
  @ApiResponse({ status: 201, description: '成功時' })
  setReady(
    @Request() req: UserRequest,
    @Param('roomId') roomId: string,
    @Body() dto: ReadyRoomDto,
  ) {
    const room = this.roomsService.setReady(
      roomId,
      req.user.userId,
      dto.isReady,
    );
    this.roomsGateway.emitRoomUpdated(room);
    return room;
  }

  @Post(':roomId/start')
  @ApiOperation({ summary: '試合を開始' })
  @ApiResponse({ status: 201, description: '成功時' })
  start(@Request() req: UserRequest, @Param('roomId') roomId: string) {
    const room = this.roomsService.start(roomId, req.user.userId);
    this.roomsGateway.emitRoomUpdated(room);
    return room;
  }

  @Get(':roomId/messages')
  @ApiOperation({ summary: 'チャットメッセージを取得' })
  @ApiResponse({ status: 200, description: '成功時' })
  findMessages(@Request() req: UserRequest, @Param('roomId') roomId: string) {
    return this.roomsChatService.findMessages(roomId, req.user.userId);
  }

  @Post(':roomId/messages')
  @ApiOperation({ summary: 'チャットメッセージを送信' })
  @ApiResponse({ status: 201, description: '成功時' })
  createMessage(
    @Request() req: UserRequest,
    @Param('roomId') roomId: string,
    @Body() dto: CreateRoomMessageDto,
  ) {
    return this.roomsChatService.createMessage(roomId, req.user.userId, dto);
  }
}
