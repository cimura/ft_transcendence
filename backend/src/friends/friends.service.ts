import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type FriendUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type FriendshipWithUsers = {
  requesterId: string;
  receiverId: string;
  requester: FriendUser;
  receiver: FriendUser;
};

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFriends(currentUserId: string) {
    const friendship = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: currentUserId }, { receiverId: currentUserId }],
      },
      include: {
        receiver: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        requester: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return friendship.map((friendship: FriendshipWithUsers) => {
      const friend =
        friendship.requesterId === currentUserId
          ? friendship.receiver
          : friendship.requester;

      return {
        id: friend.id,
        username: friend.displayName ?? friend.email,
        email: friend.email,
        avatarUrl: friend.avatarUrl,
        isOnline: false,
        status: 'offline',
      };
    });
  }

  async sendRequest(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId)
      throw new BadRequestException(
        'You cannot send a friend request to yourself',
      );

    const receiver = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!receiver) throw new NotFoundException('Target user not found');

    let pairKey: string;
    if (currentUserId < targetUserId)
      pairKey = currentUserId + ':' + targetUserId;
    else pairKey = targetUserId + ':' + currentUserId;

    function isPrismaErrorCode(error: unknown, code: string): boolean {
      if (typeof error === 'object') return false;
      if (error === null) return false;
      if (!Object.prototype.hasOwnProperty.call(error, 'code')) return false;
      return (error as { code: unknown }).code === code;
    }

    const existing = await this.prisma.friendship.findUnique({
      where: { pairKey },
    });
    if (existing)
      throw new BadRequestException(
        'Friend request or friendship already exists',
      );

    try {
      return await this.prisma.friendship.create({
        data: {
          requesterId: currentUserId,
          receiverId: targetUserId,
          pairKey,
        },
      });
    } catch (error: unknown) {
      if (isPrismaErrorCode(error, 'P2002')) {
        throw new ConflictException('This request is duplicated');
      }
      throw error;
    }
  }

  async getFriendsRequests(currentUserId: string) {
    const requesters = await this.prisma.friendship.findMany({
      where: {
        receiverId: currentUserId,
        status: 'PENDING',
      },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
    return requesters;
  }

  async acceptRequest(currentUserId: string, requestId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: requestId },
      select: {
        receiverId: true,
        status: true,
      },
    });

    if (!friendship) throw new NotFoundException('Request not found');
    if (friendship.receiverId !== currentUserId)
      throw new ForbiddenException('Logged-in user is not the receiver');
    if (friendship.status !== 'PENDING')
      throw new ConflictException(
        'Request has already been accepted or rejected',
      );

    const updated = await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
    });
    return updated;
  }

  async rejectRequest(currentUserId: string, requestId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: requestId },
      select: {
        receiverId: true,
        status: true,
      },
    });

    if (!friendship) throw new NotFoundException('Request not found');
    if (friendship.receiverId !== currentUserId)
      throw new ForbiddenException('Logged-in user is not the receiver');
    if (friendship.status !== 'PENDING')
      throw new ConflictException(
        'Request has already been accepted or rejected',
      );

    const update = await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });
    return update;
  }

  async deleteFriend(currentUserId: string, targetUserId: string) {
    const result = await this.prisma.friendship.deleteMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: currentUserId, receiverId: targetUserId },
          { receiverId: currentUserId, requesterId: targetUserId },
        ],
      },
    });
    if (result.count === 0)
      throw new BadRequestException('You are not friends');
    return result;
  }
}
