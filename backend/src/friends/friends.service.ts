import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FriendRequestStatus } from '../generated/prisma/enums';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFriends(currentUserId: string) {
    return [];
  }

  async sendRequest(currentUserId: string, targetUserId: string) {
    if (currentUserId == targetUserId)
      throw new BadRequestException(
        'You cannot send a friend request to yourself',
      );

    const receiver = this.prisma.friendship.findUnique({
      where: { id: targetUserId },
    });
    if (!receiver) throw new NotFoundException('Target user not found');

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: currentUserId, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: currentUserId },
        ],
      },
    });
    if (existing)
      throw new BadRequestException(
        'Friend request or freindship already exists',
      );

    return this.prisma.friendship.create({
      data: {
        requesterId: currentUserId,
        receiverId: targetUserId,
      },
    });
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
    if (friendship.receiverId != currentUserId)
      throw new ForbiddenException('Log-in user is not the receiver');
    if (friendship.status !== 'PENDING')
      throw new ConflictException('Request has already accepted or rejected');

    await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
    });
    return friendship;
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
    if (friendship.receiverId != currentUserId)
      throw new ForbiddenException('Log-in user is not the receiver');
    if (friendship.status !== 'PENDING')
      throw new ConflictException('Request has already accepted or rejected');

    await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });
    return friendship;
  }

  async deleteFriend(currentUserId: string, targetUserId: string) {}
}
