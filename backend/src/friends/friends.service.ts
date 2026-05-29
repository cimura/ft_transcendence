import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

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

  async acceptRequest(currentUserId: string, targetUserId: string) {
    return;
  }

  async getFriendsRequests(currentUserId: string) {
    const requesters = await this.prisma.friendship.findMany({
      where: { receiverId: currentUserId, status: 'PENDING' },
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

  async rejectRequest(currentUserId: string, targetUserId: string) {
    return;
  }

  async deleteFriend(currentUserId: string, targetUserId: string) {}
}
