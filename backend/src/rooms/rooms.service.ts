import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GamesService } from '../games/games.service';
import { BOMBERMAN_GAME_ID } from '../games/games.constants';
import { Prisma } from '../generated/prisma/client';
import { RoomMode, RoomStatus } from '../generated/prisma/enums';
import { CreateRoomDto } from './dto/create-room.dto';
import type { QueryRoomStatus } from './dto/query-rooms.dto';
import type { RoomResponse, RoomWithParticipants } from './rooms.types';

export type RoomStatusResponse = 'waiting' | 'playing' | 'finished';
export type RoomModeResponse = 'online' | 'local_cpu';
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

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamesService: GamesService,
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

  // 他のサービス(InvitationService)からも呼び出せるようにpublic化
  async getRoomOrThrow(roomId: string): Promise<RoomWithParticipants> {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: this.roomInclude(),
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  // 他のサービス(InvitationService)からも呼び出せるようにpublic化
  async joinRoomWithinTransaction(
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

  private toRoomResponse(room: RoomWithParticipants): RoomResponse {
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
}
