import { Injectable } from '@nestjs/common';
import { FriendRequestStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma.service';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { RoomsStateService } from '../rooms/rooms-state.service';

const NOTIFICATION_QUERY_LIMIT = 50;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomsState: RoomsStateService,
  ) {}

  async findAll(userId: string): Promise<NotificationResponseDto[]> {
    const friendRequests = await this.prisma.friendship.findMany({
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
      orderBy: { createdAt: 'desc' },
      take: NOTIFICATION_QUERY_LIMIT,
    });

    // ルーム招待は in-memory 管理のため同期取得。ルームが解散済みなら招待も消えている。
    const roomInvitations = this.roomsState
      .getInvitationsForInvitee(userId)
      .sort(
        (a, b) =>
          b.invitation.createdAt.getTime() - a.invitation.createdAt.getTime(),
      )
      .slice(0, NOTIFICATION_QUERY_LIMIT);

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
      ...roomInvitations.map(({ room, invitation }) => ({
        id: invitation.id,
        type: 'room_invitation' as const,
        createdAt: invitation.createdAt.toISOString(),
        actor: {
          id: invitation.inviter.id,
          username: invitation.inviter.username,
          avatarUrl: invitation.inviter.avatarUrl,
        },
        room: {
          id: room.id,
          name: room.name,
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
