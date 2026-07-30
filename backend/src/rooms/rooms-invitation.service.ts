import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FriendRequestStatus } from '../generated/prisma/enums';
import { CreateRoomInvitationDto } from './dto/create-room-invitation.dto';
import { RoomsService } from './rooms.service';
import { RoomsStateService } from './rooms-state.service';
import { RealtimeGateway } from '../websocket/realtime.gateway';
import type { RealtimeNotificationPort } from '../websocket/realtime.gateway';
import type {
  RoomInvitation,
  RoomInvitationUserSnapshot,
  RoomResponse,
} from '../common/types/room.type';

type InvitationStatusResponse = 'pending' | 'accepted' | 'declined' | 'expired';

@Injectable()
export class RoomsInvitationService {
  private readonly logger = new Logger(RoomsInvitationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly roomsService: RoomsService,
    private readonly roomsState: RoomsStateService,
    @Inject(RealtimeGateway)
    private readonly realtimeGateway: RealtimeNotificationPort,
  ) {}

  async createInvitation(
    roomId: string,
    inviterId: string,
    dto: CreateRoomInvitationDto,
  ) {
    const inviteeId = dto.inviteeId;
    if (inviterId === inviteeId) {
      throw new BadRequestException('You cannot invite yourself');
    }

    const room = this.roomsService.getRoomOrThrow(roomId);

    if (room.status !== 'WAITING') {
      throw new ConflictException('Only waiting rooms can be invited to');
    }

    const inviter = room.participants[inviterId];
    if (!inviter) {
      throw new ForbiddenException('You are not a participant of this room');
    }

    if (room.participants[inviteeId]) {
      throw new ConflictException('Invitee is already in this room');
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: [inviterId, inviteeId] } },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });
    const inviterUser = users.find((u) => u.id === inviterId);
    const inviteeUser = users.find((u) => u.id === inviteeId);
    if (!inviteeUser) {
      throw new NotFoundException('Invitee not found');
    }
    if (!inviterUser) {
      throw new NotFoundException('Inviter not found');
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: FriendRequestStatus.ACCEPTED,
        OR: [
          { requesterId: inviterId, receiverId: inviteeId },
          { requesterId: inviteeId, receiverId: inviterId },
        ],
      },
      select: { id: true },
    });
    if (!friendship) {
      throw new ForbiddenException('Only friends can be invited');
    }

    // await の間にルームが解散/変化し得るため、書き込み直前に同期で再確認する
    const currentRoom = this.roomsService.getRoomOrThrow(roomId);
    if (currentRoom.status !== 'WAITING') {
      throw new ConflictException('Only waiting rooms can be invited to');
    }
    if (currentRoom.participants[inviteeId]) {
      throw new ConflictException('Invitee is already in this room');
    }

    const existingInvitation = currentRoom.invitations[inviteeId];
    if (existingInvitation) {
      return this.toInvitationResponse(existingInvitation, currentRoom.name);
    }

    const invitation: RoomInvitation = {
      id: randomUUID(),
      roomId,
      inviterId,
      inviteeId,
      inviter: this.toSnapshot(inviterUser),
      invitee: this.toSnapshot(inviteeUser),
      createdAt: new Date(),
    };
    if (!this.roomsState.addInvitation(roomId, invitation)) {
      throw new NotFoundException('Room not found');
    }

    try {
      this.realtimeGateway.emitNotificationForUser(inviteeId, {
        id: invitation.id,
        type: 'room_invitation',
        createdAt: invitation.createdAt.toISOString(),
        actor: {
          id: invitation.inviter.id,
          username: invitation.inviter.username,
          avatarUrl: invitation.inviter.avatarUrl,
        },
        room: {
          id: invitation.roomId,
          name: currentRoom.name,
        },
        invitationId: invitation.id,
      });
    } catch (error) {
      this.roomsState.removeInvitation(roomId, inviteeId);
      this.logger.error(
        `Failed to notify room invitation { invitationId: '${invitation.id}', inviteeId: '${inviteeId}' }`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        'Room invitation notification could not be delivered',
      );
    }

    return this.toInvitationResponse(invitation, currentRoom.name);
  }

  async acceptInvitation(
    invitationId: string,
    userId: string,
  ): Promise<RoomResponse> {
    const found = this.roomsState.getInvitation(invitationId);
    if (!found) {
      throw new NotFoundException('Invitation not found');
    }
    const { room, invitation } = found;

    if (invitation.inviteeId !== userId) {
      throw new ForbiddenException('Logged-in user is not the invitee');
    }

    await this.assertCurrentFriendship(
      invitation.inviterId,
      invitation.inviteeId,
    );

    // join が満員・PLAYING 等で失敗した場合に招待を無駄に消費しないよう、成功後に削除する
    const response = await this.roomsService.join(room.id, userId);
    this.roomsState.removeInvitation(room.id, userId);

    return response;
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- 内部処理は同期化されたが、呼び出し元の非同期シグネチャを維持するため async のまま
  async declineInvitation(invitationId: string, userId: string) {
    const found = this.roomsState.getInvitation(invitationId);
    if (!found) {
      throw new NotFoundException('Invitation not found');
    }
    const { room, invitation } = found;

    if (invitation.inviteeId !== userId) {
      throw new ForbiddenException('Logged-in user is not the invitee');
    }

    this.roomsState.removeInvitation(room.id, userId);

    return { message: 'Room invitation declined.' };
  }

  private async assertCurrentFriendship(inviterId: string, inviteeId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: FriendRequestStatus.ACCEPTED,
        OR: [
          { requesterId: inviterId, receiverId: inviteeId },
          { requesterId: inviteeId, receiverId: inviterId },
        ],
      },
      select: { id: true },
    });

    if (!friendship) {
      throw new ForbiddenException({
        code: 'ROOM_INVITATION_NO_LONGER_ALLOWED',
        message:
          'Cannot join this invitation because the friendship has been terminated.',
      });
    }
  }

  private toSnapshot(user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  }): RoomInvitationUserSnapshot {
    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
    };
  }

  private toInvitationResponse(invitation: RoomInvitation, roomName: string) {
    return {
      id: invitation.id,
      roomId: invitation.roomId,
      inviterId: invitation.inviterId,
      inviteeId: invitation.inviteeId,
      status: 'pending' as InvitationStatusResponse,
      createdAt: invitation.createdAt,
      updatedAt: invitation.createdAt,
      inviter: {
        id: invitation.inviter.id,
        username: invitation.inviter.username,
        avatarUrl: invitation.inviter.avatarUrl,
      },
      invitee: {
        id: invitation.invitee.id,
        username: invitation.invitee.username,
        avatarUrl: invitation.invitee.avatarUrl,
      },
      room: {
        id: invitation.roomId,
        name: roomName,
      },
    };
  }
}
