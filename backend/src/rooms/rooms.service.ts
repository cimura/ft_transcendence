import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GamesService } from '../games/games.service';
import { BOMBERMAN_GAME_ID } from '../games/games.constants';
import { Prisma } from '../generated/prisma/client';
import {
  FriendRequestStatus,
  RoomInvitationStatus,
  RoomMode,
  RoomStatus,
} from '../generated/prisma/enums';
import { CreateRoomInvitationDto } from './dto/create-room-invitation.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateRoomMessageDto } from './dto/create-room-message.dto';
import type { QueryRoomStatus } from './dto/query-rooms.dto';
import { RealtimeGateway } from '../websocket/realtime.gateway';

const MAX_MESSAGES_PER_ROOM = 50;
const MESSAGE_COOLDOWN_MS = 1000;

type RoomStatusResponse = 'waiting' | 'playing' | 'finished';
type RoomModeResponse = 'online' | 'local_cpu';
type InvitationStatusResponse = 'pending' | 'accepted' | 'declined' | 'expired';
type CreateRoomMode = NonNullable<CreateRoomDto['mode']>;

const ROOM_STATUS_MAP: Record<QueryRoomStatus, RoomStatus> = {
  waiting: RoomStatus.WAITING,
  playing: RoomStatus.PLAYING,
  finished: RoomStatus.FINISHED,
};

const ROOM_MODE_MAP: Record<CreateRoomMode, RoomMode> = {
  online: RoomMode.ONLINE,
  local_cpu: RoomMode.LOCAL_CPU,
};

type RoomWithParticipants = {
  id: string;
  gameId: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  status: RoomStatus;
  mode: RoomMode;
  settingsSnapshot: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  host: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  participants: Array<{
    userId: string;
    isHost: boolean;
    isReady: boolean;
    joinedAt: Date;
    user: {
      id: string;
      email: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
  }>;
};

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamesService: GamesService,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
  ) {}

  async findAll(status?: QueryRoomStatus) {
    const roomStatus = status ? this.toRoomStatus(status) : undefined;
    const rooms = await this.prisma.gameRoom.findMany({
      where: roomStatus ? { status: roomStatus } : undefined,
      include: this.roomInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return rooms.map((room) => this.toRoomResponse(room));
  }

  async create(userId: string, dto: CreateRoomDto) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Room name is required');
    }

    const gameId = dto.gameId ?? BOMBERMAN_GAME_ID;
    const game = this.gamesService.findById(gameId);
    const mode = this.toRoomMode(dto.mode ?? 'online');

    if (!game.supportedPlayers.includes(dto.maxPlayers)) {
      throw new BadRequestException('Unsupported maxPlayers for this game');
    }

    const room = await this.prisma.gameRoom.create({
      data: {
        gameId: game.id,
        name,
        hostId: userId,
        maxPlayers: dto.maxPlayers,
        mode,
        settingsSnapshot: game.settings,
        participants: {
          create: {
            userId,
            isHost: true,
            isReady: true,
          },
        },
      },
      include: this.roomInclude(),
    });

    return this.toRoomResponse(room);
  }

  async findOne(roomId: string) {
    return this.toRoomResponse(await this.getRoomOrThrow(roomId));
  }

  async join(roomId: string, userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await this.joinRoomWithinTransaction(tx, roomId, userId);
    });

    return this.findOne(roomId);
  }

  async createInvitation(
    roomId: string,
    inviterId: string,
    dto: CreateRoomInvitationDto,
  ) {
    const inviteeId = dto.inviteeId;
    if (inviterId === inviteeId) {
      throw new BadRequestException('You cannot invite yourself');
    }

    const room = await this.getRoomOrThrow(roomId);
    if (room.status !== RoomStatus.WAITING) {
      throw new ConflictException('Only waiting rooms can be invited to');
    }

    const inviter = room.participants.find(
      (participant) => participant.userId === inviterId,
    );
    if (!inviter) {
      throw new ForbiddenException('You are not a participant of this room');
    }

    if (
      room.participants.some((participant) => participant.userId === inviteeId)
    ) {
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
      return this.toInvitationResponse(existingInvitation);
    }

    let invitation: Parameters<typeof this.toInvitationResponse>[0];
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
          return this.toInvitationResponse(pendingInvitation);
        }
      }
      throw error;
    }

    const invitationResponse = this.toInvitationResponse(invitation);
    this.realtimeGateway?.emitNotificationForUser(inviteeId, {
      id: invitationResponse.id,
      type: 'room_invitation',
      createdAt: invitationResponse.createdAt.toISOString(),
      actor: invitationResponse.inviter,
      room: invitationResponse.room,
      invitationId: invitationResponse.id,
    });

    return invitationResponse;
  }

  async acceptInvitation(invitationId: string, userId: string) {
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

      acceptedRoomId = await this.joinRoomWithinTransaction(
        tx,
        invitation.roomId,
        userId,
      );
    });

    if (!acceptedRoomId) {
      throw new NotFoundException('Room not found');
    }

    return this.findOne(acceptedRoomId);
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

  async leave(roomId: string, userId: string) {
    const result = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.$queryRaw`
        SELECT id FROM "GameRoom" WHERE id = ${roomId} FOR UPDATE
      `;

        const room = await tx.gameRoom.findUnique({
          where: { id: roomId },
          include: this.roomInclude(),
        });

        if (!room) {
          throw new NotFoundException('Room not found');
        }

        if (room.status !== RoomStatus.WAITING) {
          throw new ConflictException('Only waiting rooms can be left');
        }

        const participant = room.participants.find(
          (item) => item.userId === userId,
        );
        if (!participant) {
          throw new ForbiddenException(
            'You are not a participant of this room',
          );
        }

        const remainingParticipants = room.participants.filter(
          (item) => item.userId !== userId,
        );

        if (participant.isHost && remainingParticipants.length === 0) {
          await tx.gameRoom.delete({ where: { id: roomId } });
          return { deleted: true as const, roomId };
        }

        await tx.roomParticipant.delete({
          where: { roomId_userId: { roomId, userId } },
        });

        if (participant.isHost) {
          const nextHost = remainingParticipants[0];
          await tx.roomParticipant.updateMany({
            where: { roomId },
            data: { isHost: false },
          });
          await tx.roomParticipant.update({
            where: { roomId_userId: { roomId, userId: nextHost.userId } },
            data: { isHost: true, isReady: true },
          });
          await tx.gameRoom.update({
            where: { id: roomId },
            data: { hostId: nextHost.userId },
          });
        }

        return { deleted: false as const, roomId };
      },
    );

    if (result.deleted) {
      return { deleted: true, roomId };
    }

    return this.findOne(roomId);
  }

  async setReady(roomId: string, userId: string, isReady: boolean) {
    const room = await this.getRoomOrThrow(roomId);

    if (room.status !== RoomStatus.WAITING) {
      throw new ConflictException('Ready can only be changed in waiting rooms');
    }

    const participant = room.participants.find(
      (item) => item.userId === userId,
    );
    if (!participant) {
      throw new ForbiddenException('You are not a participant of this room');
    }

    if (participant.isHost && !isReady) {
      throw new BadRequestException('Host is always ready');
    }

    await this.prisma.roomParticipant.update({
      where: { roomId_userId: { roomId, userId } },
      data: { isReady: participant.isHost ? true : isReady },
    });

    return this.findOne(roomId);
  }

  async start(roomId: string, userId: string) {
    const room = await this.getRoomOrThrow(roomId);

    if (room.status !== RoomStatus.WAITING) {
      throw new ConflictException('Only waiting rooms can be started');
    }

    const participant = room.participants.find(
      (item) => item.userId === userId,
    );
    if (!participant) {
      throw new ForbiddenException('You are not a participant of this room');
    }

    if (!participant.isHost) {
      throw new ForbiddenException('Only the host can start the room');
    }

    this.assertStartable(room);

    await this.prisma.gameRoom.update({
      where: { id: roomId },
      data: {
        status: RoomStatus.PLAYING,
        startedAt: new Date(),
      },
    });

    return this.findOne(roomId);
  }

  async findMessages(roomId: string, userId: string) {
    await this.assertParticipant(roomId, userId);

    const messages = await this.prisma.roomMessage.findMany({
      where: { roomId },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_MESSAGES_PER_ROOM,
    });

    return messages.reverse().map((message) => ({
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      senderName: this.userName(message.sender),
      senderAvatarUrl: message.sender.avatarUrl,
      content: message.content,
      createdAt: message.createdAt,
    }));
  }

  async findSocketMessages(roomId: string, userId: string) {
    const messages = await this.findMessages(roomId, userId);
    return messages.map((message) => this.toSocketMessage(message));
  }

  async createSocketMessage(roomId: string, userId: string, text: string) {
    const message = await this.createMessage(roomId, userId, {
      content: text,
    });

    return this.toSocketMessage(message);
  }

  async createMessage(
    roomId: string,
    userId: string,
    dto: CreateRoomMessageDto,
  ) {
    const room = await this.getRoomOrThrow(roomId);
    const participant = room.participants.find(
      (item) => item.userId === userId,
    );

    if (!participant) {
      throw new ForbiddenException('You are not a participant of this room');
    }

    if (room.status !== RoomStatus.WAITING) {
      throw new ConflictException('Messages can only be sent in waiting rooms');
    }

    const content = dto.content.trim();
    if (!content) {
      throw new BadRequestException('Message content is required');
    }

    if (content.length > 200) {
      throw new BadRequestException(
        'Message content must be 200 characters or less',
      );
    }

    const latestMessage = await this.prisma.roomMessage.findFirst({
      where: { roomId, senderId: userId },
      orderBy: { createdAt: 'desc' },
    });

    if (
      latestMessage &&
      Date.now() - latestMessage.createdAt.getTime() < MESSAGE_COOLDOWN_MS
    ) {
      throw new ConflictException('Please wait before sending another message');
    }

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.roomMessage.create({
        data: {
          roomId,
          senderId: userId,
          content: this.escapeHtml(content),
        },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      const oldMessages = await tx.roomMessage.findMany({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
        skip: MAX_MESSAGES_PER_ROOM,
        select: { id: true },
      });

      if (oldMessages.length > 0) {
        await tx.roomMessage.deleteMany({
          where: { id: { in: oldMessages.map((item) => item.id) } },
        });
      }

      return created;
    });

    return {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      senderName: this.userName(message.sender),
      senderAvatarUrl: message.sender.avatarUrl,
      content: message.content,
      createdAt: message.createdAt,
    };
  }

  private async assertParticipant(roomId: string, userId: string) {
    const room = await this.getRoomOrThrow(roomId);
    const participant = room.participants.find(
      (item) => item.userId === userId,
    );
    if (!participant) {
      throw new ForbiddenException('You are not a participant of this room');
    }
  }

  private async getRoomOrThrow(roomId: string) {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: this.roomInclude(),
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  private async joinRoomWithinTransaction(
    tx: Prisma.TransactionClient,
    roomId: string,
    userId: string,
  ) {
    await tx.$queryRaw`
      SELECT id FROM "GameRoom" WHERE id = ${roomId} FOR UPDATE
    `;

    const room = await tx.gameRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          select: { userId: true },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.status !== RoomStatus.WAITING) {
      throw new ConflictException('Only waiting rooms can be joined');
    }

    if (room.mode === RoomMode.LOCAL_CPU && room.hostId !== userId) {
      throw new ConflictException('Local CPU rooms cannot be joined');
    }

    if (
      room.participants.some((participant) => participant.userId === userId)
    ) {
      return room.id;
    }

    if (room.participants.length >= room.maxPlayers) {
      throw new ConflictException('Room is full');
    }

    await tx.roomParticipant.create({
      data: {
        roomId,
        userId,
        isHost: false,
        isReady: false,
      },
    });

    return room.id;
  }

  private roomInclude() {
    return {
      host: {
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { joinedAt: 'asc' as const },
      },
    };
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
      room: {
        select: {
          id: true,
          name: true,
        },
      },
    };
  }

  private toRoomResponse(room: RoomWithParticipants) {
    return {
      id: room.id,
      gameId: room.gameId,
      name: room.name,
      hostId: room.hostId,
      hostName: this.userName(room.host),
      maxPlayers: room.maxPlayers,
      status: this.toStatusResponse(room.status),
      mode: this.toModeResponse(room.mode),
      settingsSnapshot: room.settingsSnapshot,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      startedAt: room.startedAt,
      finishedAt: room.finishedAt,
      players: room.participants.map((participant) => ({
        userId: participant.userId,
        username: this.userName(participant.user),
        avatarUrl: participant.user.avatarUrl,
        isReady: participant.isReady,
        isHost: participant.isHost,
        joinedAt: participant.joinedAt,
      })),
    };
  }

  private toInvitationResponse(invitation: {
    id: string;
    roomId: string;
    inviterId: string;
    inviteeId: string;
    status: RoomInvitationStatus;
    createdAt: Date;
    updatedAt: Date;
    inviter: {
      id: string;
      email: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
    invitee: {
      id: string;
      email: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
    room: {
      id: string;
      name: string;
    };
  }) {
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
      room: invitation.room,
    };
  }

  private toRoomStatus(status: QueryRoomStatus) {
    return ROOM_STATUS_MAP[status];
  }

  private toRoomMode(mode: CreateRoomMode) {
    return ROOM_MODE_MAP[mode];
  }

  private toStatusResponse(status: RoomStatus): RoomStatusResponse {
    if (status === RoomStatus.WAITING) return 'waiting';
    if (status === RoomStatus.PLAYING) return 'playing';
    return 'finished';
  }

  private toModeResponse(mode: RoomMode): RoomModeResponse {
    if (mode === RoomMode.LOCAL_CPU) return 'local_cpu';
    return 'online';
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

  private assertStartable(room: RoomWithParticipants) {
    if (room.mode === RoomMode.LOCAL_CPU) {
      if (room.participants.length !== 1) {
        throw new ConflictException(
          'Local CPU rooms must have exactly one human player',
        );
      }
      return;
    }

    if (room.participants.length !== room.maxPlayers) {
      throw new ConflictException('Room is not full');
    }

    if (!room.participants.every((item) => item.isReady)) {
      throw new ConflictException('All participants must be ready');
    }
  }

  private userName(user: { email: string; displayName: string | null }) {
    return user.displayName ?? user.email;
  }

  private toSocketMessage(message: {
    id: string;
    roomId: string;
    senderId: string;
    senderName: string;
    senderAvatarUrl: string | null;
    content: string;
    createdAt: Date;
  }) {
    return {
      id: message.id,
      roomId: message.roomId,
      userId: message.senderId,
      username: message.senderName,
      avatarUrl: message.senderAvatarUrl,
      text: message.content,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
