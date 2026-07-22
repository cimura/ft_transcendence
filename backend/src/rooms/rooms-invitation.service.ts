import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../generated/prisma/client';
import {
  FriendRequestStatus,
  RoomInvitationStatus,
} from '../generated/prisma/enums';
import { CreateRoomInvitationDto } from './dto/create-room-invitation.dto';
import { RoomsService } from './rooms.service';
import { RoomResponse } from '../common/types/room.type';

type InvitationStatusResponse = 'pending' | 'accepted' | 'declined' | 'expired';

type InvitationPayload = Prisma.RoomInvitationGetPayload<{
  include: {
    inviter: {
      select: { id: true; displayName: true; email: true; avatarUrl: true };
    };
    invitee: {
      select: { id: true; displayName: true; email: true; avatarUrl: true };
    };
  };
}>;

@Injectable()
export class RoomsInvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomsService: RoomsService,
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

    const invitee = await this.prisma.user.findUnique({
      where: { id: inviteeId },
      select: { id: true },
    });
    if (!invitee) {
      throw new NotFoundException('Invitee not found');
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

    const existingInvitation = await this.prisma.roomInvitation.findFirst({
      where: {
        roomId,
        inviteeId,
        status: RoomInvitationStatus.PENDING,
      },
      include: this.invitationInclude(),
    });

    if (existingInvitation) {
      return this.toInvitationResponse(existingInvitation, room.name);
    }

    let invitation: InvitationPayload;
    try {
      invitation = await this.prisma.roomInvitation.create({
        data: {
          roomId,
          inviterId,
          inviteeId,
        },
        include: this.invitationInclude(),
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const pendingInvitation = await this.prisma.roomInvitation.findFirst({
          where: {
            roomId,
            inviteeId,
            status: RoomInvitationStatus.PENDING,
          },
          include: this.invitationInclude(),
        });
        if (pendingInvitation) {
          return this.toInvitationResponse(pendingInvitation, room.name);
        }
      }
      throw error;
    }

    return this.toInvitationResponse(invitation, room.name);
  }

  async acceptInvitation(
    invitationId: string,
    userId: string,
  ): Promise<RoomResponse> {
    let acceptedRoomId: string | undefined;

    await this.prisma.$transaction(async (tx) => {
      const invitation = await tx.roomInvitation.findUnique({
        where: { id: invitationId },
        select: {
          id: true,
          roomId: true,
          inviterId: true,
          inviteeId: true,
          status: true,
        },
      });

      if (!invitation) {
        throw new NotFoundException('Invitation not found');
      }

      if (invitation.inviteeId !== userId) {
        throw new ForbiddenException('Logged-in user is not the invitee');
      }

      if (invitation.status !== RoomInvitationStatus.PENDING) {
        throw new ConflictException(
          'Invitation has already been accepted or declined',
        );
      }

      await this.assertCurrentFriendshipWithinTransaction(
        tx,
        invitation.inviterId,
        invitation.inviteeId,
      );

      const updateResult = await tx.roomInvitation.updateMany({
        where: {
          id: invitationId,
          inviteeId: userId,
          status: RoomInvitationStatus.PENDING,
        },
        data: { status: RoomInvitationStatus.ACCEPTED },
      });
      if (updateResult.count === 0) {
        throw new ConflictException(
          'Invitation has already been accepted or declined',
        );
      }

      acceptedRoomId = invitation.roomId;
    });

    if (!acceptedRoomId) {
      throw new NotFoundException('Room not found');
    }

    // データベースでの招待状態の更新が成功してから、メモリ上のルームに参加させる
    return this.roomsService.join(acceptedRoomId, userId);
  }

  async declineInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.roomInvitation.findUnique({
      where: { id: invitationId },
      select: {
        inviteeId: true,
        status: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.inviteeId !== userId) {
      throw new ForbiddenException('Logged-in user is not the invitee');
    }

    if (invitation.status !== RoomInvitationStatus.PENDING) {
      throw new ConflictException(
        'Invitation has already been accepted or declined',
      );
    }

    const updateResult = await this.prisma.roomInvitation.updateMany({
      where: {
        id: invitationId,
        inviteeId: userId,
        status: RoomInvitationStatus.PENDING,
      },
      data: { status: RoomInvitationStatus.DECLINED },
    });
    if (updateResult.count === 0) {
      throw new ConflictException(
        'Invitation has already been accepted or declined',
      );
    }

    return { message: 'Room invitation declined.' };
  }

  private invitationInclude() {
    return {
      inviter: {
        select: {
          id: true,
          displayName: true,
          email: true,
          avatarUrl: true,
        },
      },
      invitee: {
        select: {
          id: true,
          displayName: true,
          email: true,
          avatarUrl: true,
        },
      },
    };
  }

  private toInvitationResponse(
    invitation: InvitationPayload,
    roomName: string,
  ) {
    return {
      id: invitation.id,
      roomId: invitation.roomId,
      inviterId: invitation.inviterId,
      inviteeId: invitation.inviteeId,
      status: this.toInvitationStatusResponse(invitation.status),
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
      inviter: {
        id: invitation.inviter.id,
        username: this.userName(invitation.inviter),
        avatarUrl: invitation.inviter.avatarUrl,
      },
      invitee: {
        id: invitation.invitee.id,
        username: this.userName(invitation.invitee),
        avatarUrl: invitation.invitee.avatarUrl,
      },
      room: {
        id: invitation.roomId,
        name: roomName,
      },
    };
  }

  private toInvitationStatusResponse(
    status: RoomInvitationStatus,
  ): InvitationStatusResponse {
    if (status === RoomInvitationStatus.PENDING) return 'pending';
    if (status === RoomInvitationStatus.ACCEPTED) return 'accepted';
    if (status === RoomInvitationStatus.DECLINED) return 'declined';
    return 'expired';
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private async assertCurrentFriendshipWithinTransaction(
    tx: Prisma.TransactionClient,
    inviterId: string,
    inviteeId: string,
  ) {
    const friendships = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "Friendship"
      WHERE "status"::text = ${FriendRequestStatus.ACCEPTED}
        AND (
          ("requesterId" = ${inviterId} AND "receiverId" = ${inviteeId})
          OR
          ("requesterId" = ${inviteeId} AND "receiverId" = ${inviterId})
        )
      FOR UPDATE
    `;

    if (friendships.length === 0) {
      throw new ForbiddenException({
        code: 'ROOM_INVITATION_NO_LONGER_ALLOWED',
        message:
          'Cannot join this invitation because the friendship has been terminated.',
      });
    }
  }

  private userName(user: { email: string; displayName: string | null }) {
    return user.displayName ?? user.email;
  }
}
