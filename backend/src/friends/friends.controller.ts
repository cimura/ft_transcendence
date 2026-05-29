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

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  @Get()
  friendsGet(@Request() req: any) {
    const currentUserId = req.user.userId;
    return this.friendsService.getFriends(currentUserId);
  }

  // send request
  @Post('request')
  friendsRequest(@Request() req: any, @Body() body: any) {
    const currentUserId = req.user.userId;
    const targetUserId = body.userId;
    return this.friendsService.sendRequest(currentUserId, targetUserId);
  }

  // get all request(list)
  @Get('requests')
  friendsRequests(@Request() req: any) {
    const currentUserId = req.user.userId;
    return this.friendsService.getFriendsRequests(currentUserId);
  }

  @Put(':id/accept')
  friendsAccept(@Request() req: any, @Param('id') id: string) {
    const currentUserId = req.user.userId;
    const friendshipId = id;
    return this.friendsService.acceptRequest(currentUserId, friendshipId);
  }

  @Put(':id/reject')
  friendsReject(@Request() req: any, @Param('id') id: string) {
    const currentUserId = req.user.userId;
    const friendshipId = id;
    return this.friendsService.rejectRequest(currentUserId, friendshipId);
  }

  @Delete(':id')
  friendsDelete(@Request() req: any, @Param('id') id: string) {
    const currentUserId = req.user.userId;
    const friendUserId = id;
    return this.friendsService.deleteFriend(currentUserId, friendUserId);
  }
}
