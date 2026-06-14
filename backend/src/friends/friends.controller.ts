import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  UseGuards,
  Request,
  Body,
  Param,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import type { UserRequest } from '../users/interfaces/user-request.interface';
import {
  FriendInfoDto,
  FriendRequestResponseDto,
  ReceivedFriendRequestDto,
  FriendAcceptResponseDto,
  FriendRejectResponseDto,
  FriendDeleteResponseDto,
} from './dto/friends-response.dto';

@Controller('friends')
@ApiTags('friends')
@ApiUnauthorizedResponse({ description: '認証失敗時（未ログイン）' })
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  @Get()
  @ApiOperation({ summary: 'フレンド一覧の取得' })
  @ApiOkResponse({ description: '成功時', type: FriendInfoDto, isArray: true })
  friendsGet(@Request() req: UserRequest): Promise<FriendInfoDto[]> {
    const currentUserId = req.user.userId;
    return this.friendsService.getFriends(currentUserId);
  }

  // send request
  @Post('request')
  @ApiOperation({ summary: 'フレンド申請を送信' })
  @ApiCreatedResponse({
    description: '成功時',
    type: FriendRequestResponseDto,
  })
  @ApiBadRequestResponse({
    description: '自分自身にフレンド申請を送ろうとしている時',
  })
  @ApiBadRequestResponse({
    description: '申請対象のユーザーと既にフレンドまたは申請状態の時',
  })
  @ApiNotFoundResponse({
    description: '申請対象のユーザーが存在しない時',
  })
  @ApiConflictResponse({
    description: '既にフレンド申請が存在している時',
  })
  friendsRequest(
    @Request() req: UserRequest,
    @Body() body: SendFriendRequestDto,
  ): Promise<FriendRequestResponseDto> {
    const currentUserId = req.user.userId;
    const targetUserId = body.targetUserId;
    return this.friendsService.sendRequest(currentUserId, targetUserId);
  }

  // get all request(list)
  @Get('requests')
  @ApiOperation({ summary: '届いているフレンド申請一覧を取得' })
  @ApiOkResponse({
    description: '成功時',
    type: ReceivedFriendRequestDto,
    isArray: true,
  })
  friendsRequests(
    @Request() req: UserRequest,
  ): Promise<ReceivedFriendRequestDto[]> {
    const currentUserId = req.user.userId;
    return this.friendsService.getFriendsRequests(currentUserId);
  }

  @Put(':requestId/accept')
  @ApiOperation({ summary: 'フレンド申請を承認' })
  @ApiOkResponse({
    description: '成功時',
    type: FriendAcceptResponseDto,
  })
  friendsAccept(
    @Request() req: UserRequest,
    @Param('requestId') id: string,
  ): Promise<FriendAcceptResponseDto> {
    const currentUserId = req.user.userId;
    const friendshipId = id;
    return this.friendsService.acceptRequest(currentUserId, friendshipId);
  }

  @Put(':requestId/reject')
  @ApiOperation({ summary: 'フレンド申請を拒否' })
  @ApiOkResponse({ description: '成功時', type: FriendRejectResponseDto })
  @ApiNotFoundResponse({ description: 'フレンド申請が見つからない時' })
  @ApiForbiddenResponse({ description: 'フレンド申請が自分宛てではなかった時' })
  @ApiConflictResponse({
    description: 'フレンド申請が既に承認または拒否されていた時',
  })
  friendsReject(
    @Request() req: UserRequest,
    @Param('requestId') id: string,
  ): Promise<FriendRejectResponseDto> {
    const currentUserId = req.user.userId;
    const friendshipId = id;
    return this.friendsService.rejectRequest(currentUserId, friendshipId);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'フレンドを削除' })
  @ApiOkResponse({ description: '成功時', type: FriendDeleteResponseDto })
  @ApiBadRequestResponse({ description: '対象のユーザーがフレンドではない時' })
  friendsDelete(
    @Request() req: UserRequest,
    @Param('userId') id: string,
  ): Promise<FriendDeleteResponseDto> {
    const currentUserId = req.user.userId;
    const friendUserId = id;
    return this.friendsService.deleteFriend(currentUserId, friendUserId);
  }
}
