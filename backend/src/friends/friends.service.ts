import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { FriendRequestStatus } from '../generated/prisma/enums';
import {
  FriendAcceptResponseDto,
  FriendDeleteResponseDto,
  FriendInfoDto,
  FriendRejectResponseDto,
  ReceivedFriendRequestDto,
} from './dto/friends-response.dto';
import { FriendRequestResponseDto } from './dto/friends-response.dto';
import { RealtimeGateway } from '../websocket/realtime.gateway';

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
  ) {}

  async getFriends(currentUserId: string): Promise<FriendInfoDto[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FriendRequestStatus.ACCEPTED,
        OR: [{ requesterId: currentUserId }, { receiverId: currentUserId }],
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        requester: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return friendships.map((friendship) => {
      const friend =
        friendship.requesterId === currentUserId
          ? friendship.receiver
          : friendship.requester;

      return {
        id: friend.id,
        username: friend.username,
        avatarUrl: friend.avatarUrl,
      };
    });
  }

  async sendRequest(
    currentUserId: string,
    targetUserId: string,
  ): Promise<FriendRequestResponseDto> {
    if (currentUserId === targetUserId) {
      throw new BadRequestException(
        'You cannot send a friend request to yourself',
      );
    }

    const receiver = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!receiver) {
      throw new NotFoundException('Target user not found');
    }

    let pairKey: string;
    if (currentUserId < targetUserId) {
      pairKey = `${currentUserId}:${targetUserId}`;
    } else {
      pairKey = `${targetUserId}:${currentUserId}`;
    }

    const existing = await this.prisma.friendship.findUnique({
      where: { pairKey },
    });
    if (existing) {
      throw new BadRequestException(
        'Friend request or friendship already exists',
      );
    }

    try {
      const request = await this.prisma.friendship.create({
        data: {
          requesterId: currentUserId,
          receiverId: targetUserId,
          pairKey,
        },
        include: {
          requester: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      });

      this.realtimeGateway?.emitNotificationForUser(targetUserId, {
        id: request.id,
        type: 'friend_request',
        createdAt: request.createdAt.toISOString(),
        actor: {
          id: request.requester.id,
          username: request.requester.username,
          avatarUrl: request.requester.avatarUrl,
        },
        friendRequestId: request.id,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('This request is duplicated');
      }
      throw error;
    }

    return {
      message: 'Friend request has been successfully sent.',
      status: FriendRequestStatus.PENDING,
    };
  }

  async getFriendsRequests(
    currentUserId: string,
  ): Promise<ReceivedFriendRequestDto[]> {
    const requesters = await this.prisma.friendship.findMany({
      where: {
        receiverId: currentUserId,
        status: FriendRequestStatus.PENDING,
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return requesters.map((req) => ({
      id: req.id, // friendship レコード自体のID (requestId)
      status: req.status, // "PENDING"
      requester: {
        id: req.requester.id,
        username: req.requester.username,
        avatarUrl: req.requester.avatarUrl,
      },
    }));
  }

  async acceptRequest(
    currentUserId: string,
    requestId: string,
  ): Promise<FriendAcceptResponseDto> {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: requestId },
      select: { receiverId: true },
    });

    if (!friendship) {
      throw new NotFoundException('Request not found');
    }
    if (friendship.receiverId !== currentUserId) {
      throw new ForbiddenException('Logged-in user is not the receiver');
    }

    const result = await this.prisma.friendship.updateMany({
      where: {
        id: requestId,
        receiverId: currentUserId,
        status: FriendRequestStatus.PENDING,
      },
      data: { status: FriendRequestStatus.ACCEPTED },
    });
    if (result.count === 0) {
      throw new ConflictException(
        'Request has already been accepted or rejected',
      );
    }

    return {
      message: 'Friend request accepted.',
      status: FriendRequestStatus.ACCEPTED,
    };
  }

  async rejectRequest(
    currentUserId: string,
    requestId: string,
  ): Promise<FriendRejectResponseDto> {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: requestId },
      select: {
        receiverId: true,
      },
    });

    if (!friendship) {
      throw new NotFoundException('Request not found');
    }
    if (friendship.receiverId !== currentUserId) {
      throw new ForbiddenException('Logged-in user is not the receiver');
    }

    const result = await this.prisma.friendship.deleteMany({
      where: {
        id: requestId,
        receiverId: currentUserId,
        status: FriendRequestStatus.PENDING,
      },
    });
    if (result.count === 0) {
      throw new ConflictException(
        'Request has already been accepted or rejected',
      );
    }

    return {
      message: 'Friend request has been successfully rejected and removed.',
    };
  }

  async deleteFriend(
    currentUserId: string,
    targetUserId: string,
  ): Promise<FriendDeleteResponseDto> {
    const result = await this.prisma.friendship.deleteMany({
      where: {
        status: FriendRequestStatus.ACCEPTED,
        OR: [
          { requesterId: currentUserId, receiverId: targetUserId },
          { receiverId: currentUserId, requesterId: targetUserId },
        ],
      },
    });
    if (result.count === 0) {
      throw new BadRequestException('You are not friends');
    }

    return {
      message: 'Friend has been successfully deleted.',
    };
  }
}
