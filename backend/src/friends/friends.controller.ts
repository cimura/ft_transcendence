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
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/auth.interface';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  @Get()
  friendsGet(@Request() req: AuthenticatedRequest) {
    const currentUserId = req.user.userId;
    return this.friendsService.getFriends(currentUserId);
  }

  // send request
  @Post('request')
  friendsRequest(
    @Request() req: AuthenticatedRequest,
    @Body() body: SendFriendRequestDto,
  ) {
    const currentUserId = req.user.userId;
    const targetUserId = body.targetUserId;
    return this.friendsService.sendRequest(currentUserId, targetUserId);
  }

  // get all request(list)
  @Get('requests')
  friendsRequests(@Request() req: AuthenticatedRequest) {
    const currentUserId = req.user.userId;
    return this.friendsService.getFriendsRequests(currentUserId);
  }

  @Put(':requestId/accept')
  friendsAccept(
    @Request() req: AuthenticatedRequest,
    @Param('requestId') id: string,
  ) {
    const currentUserId = req.user.userId;
    const friendshipId = id;
    return this.friendsService.acceptRequest(currentUserId, friendshipId);
  }

  @Put(':requestId/reject')
  friendsReject(
    @Request() req: AuthenticatedRequest,
    @Param('requestId') id: string,
  ) {
    const currentUserId = req.user.userId;
    const friendshipId = id;
    return this.friendsService.rejectRequest(currentUserId, friendshipId);
  }

  @Delete(':userId')
  friendsDelete(
    @Request() req: AuthenticatedRequest,
    @Param('userId') id: string,
  ) {
    const currentUserId = req.user.userId;
    const friendUserId = id;
    return this.friendsService.deleteFriend(currentUserId, friendUserId);
  }
}
