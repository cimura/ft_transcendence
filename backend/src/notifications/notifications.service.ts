import { Injectable } from '@nestjs/common';
import {
  FriendRequestStatus,
  RoomInvitationStatus,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma.service';
import { NotificationResponseDto } from './dto/notification-response.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<NotificationResponseDto[]> {
    const [friendRequests, roomInvitations] = await Promise.all([
      this.prisma.friendship.findMany({
        where: {
          receiverId: userId,
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
      }),
      this.prisma.roomInvitation.findMany({
        where: {
          inviteeId: userId,
          status: RoomInvitationStatus.PENDING,
        },
        include: {
          inviter: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const notifications: NotificationResponseDto[] = [
      ...friendRequests.map((request) => ({
        id: request.id,
        type: 'friend_request' as const,
        createdAt: request.createdAt.toISOString(),
        actor: {
          id: request.requester.id,
          username: request.requester.username,
          avatarUrl: request.requester.avatarUrl,
        },
        friendRequestId: request.id,
      })),
      ...roomInvitations.map((invitation) => ({
        id: invitation.id,
        type: 'game_invite' as const,
        createdAt: invitation.createdAt.toISOString(),
        actor: {
          id: invitation.inviter.id,
          username: invitation.inviter.username,
          avatarUrl: invitation.inviter.avatarUrl,
        },
        room: {
          id: invitation.room.id,
          name: invitation.room.name,
        },
        invitationId: invitation.id,
      })),
    ];

    return notifications.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
}
