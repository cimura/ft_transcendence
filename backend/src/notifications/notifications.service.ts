import { Injectable } from '@nestjs/common';
import {
  FriendRequestStatus,
  RoomInvitationStatus,
} from '../generated/prisma/enums';
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
        orderBy: { createdAt: 'desc' },
        take: NOTIFICATION_QUERY_LIMIT,
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
        },
        orderBy: { createdAt: 'desc' },
        take: NOTIFICATION_QUERY_LIMIT,
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
      ...roomInvitations.map((invitation) => {
        const room = this.roomsState.getRoom(invitation.roomId);

        return {
          id: invitation.id,
          type: 'room_invitation' as const,
          createdAt: invitation.createdAt.toISOString(),
          actor: {
            id: invitation.inviter.id,
            username: invitation.inviter.username,
            avatarUrl: invitation.inviter.avatarUrl,
          },
          room: {
            id: invitation.roomId,
            // ルームが既に解散されている場合は代替テキストを設定
            name: room ? room.name : 'Unknown Room',
          },
          invitationId: invitation.id,
        };
      }),
    ];

    return notifications.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
}
