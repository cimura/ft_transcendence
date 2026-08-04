import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { UserRequest } from '../users/interfaces/user-request.interface';
import { CreateRoomInvitationDto } from './dto/create-room-invitation.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { QueryRoomsDto } from './dto/query-rooms.dto';
import { ReadyRoomDto } from './dto/ready-room.dto';
import { RoomsService } from './rooms.service';
import { RoomsInvitationService } from './rooms-invitation.service';
import type { RoomSnapshot } from '@ft_transcendence/shared/rooms-events.types';

@ApiTags('rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly roomsInvitationService: RoomsInvitationService,
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
  async join(@Request() req: UserRequest, @Param('roomId') roomId: string) {
    return this.roomsService.join(roomId, req.user.userId);
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
    return this.roomsInvitationService.acceptInvitation(
      invitationId,
      req.user.userId,
    );
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ルームから退出' })
  @ApiResponse({ status: 200, description: '成功時。退出後のルーム情報を返す' })
  @ApiNoContentResponse({
    description: '最後の参加者が退出し、ルームごと削除された時',
  })
  leave(
    @Request() req: UserRequest,
    @Param('roomId') roomId: string,
    @Res({ passthrough: true }) res: Response,
  ): RoomSnapshot | undefined {
    const room = this.roomsService.leave(roomId, req.user.userId);

    // 削除された場合、どのルームかは呼び出し側が URL で指定済みなので返すものが無い
    if (room === null) {
      res.status(HttpStatus.NO_CONTENT);
      return undefined;
    }

    return room;
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
}
