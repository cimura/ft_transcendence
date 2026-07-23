import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import { GamesService } from '../games/games.service';
import { RoomsStateService } from './rooms-state.service';
import { BOMBERMAN_GAME_ID } from '../games/games.constants';
import { CreateRoomDto } from './dto/create-room.dto';
import type { QueryRoomStatus } from './dto/query-rooms.dto';
import type {
  Room,
  RoomParticipant,
  RoomStatus,
  RoomMode,
  RoomResponse,
  RoomStatusResponse,
  RoomModeResponse,
} from '../common/types/room.type';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamesService: GamesService,
    private readonly roomsState: RoomsStateService,
  ) {}

  findAll(status?: QueryRoomStatus): RoomResponse[] {
    let rooms = this.roomsState.getAllRooms();

    if (status) {
      const targetStatus = status.toUpperCase() as RoomStatus;
      rooms = rooms.filter((room) => room.status === targetStatus);
    }

    // 作成日時の降順でソート
    rooms.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return rooms.map((room) => this.toRoomResponse(room));
  }

  async create(userId: string, dto: CreateRoomDto): Promise<RoomResponse> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Room name is required');
    }

    const gameId = dto.gameId ?? BOMBERMAN_GAME_ID;
    const game = this.gamesService.findById(gameId);

    if (!game.supportedPlayers.includes(dto.maxPlayers)) {
      throw new BadRequestException('Unsupported maxPlayers for this game');
    }

    // ユーザー情報をDBから取得
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const roomId = randomUUID();
    const mode: RoomMode = dto.mode === 'local_cpu' ? 'LOCAL_CPU' : 'ONLINE';

    const hostParticipant: RoomParticipant = {
      userId,
      username: user.displayName ?? user.email,
      avatarUrl: user.avatarUrl,
      isHost: true,
      isReady: true,
      joinedAt: new Date(),
    };

    const newRoom: Room = {
      id: roomId,
      gameId: game.id,
      name,
      hostId: userId,
      maxPlayers: dto.maxPlayers,
      status: 'WAITING',
      mode,
      participants: {
        [userId]: hostParticipant,
      },
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.roomsState.addRoom(newRoom);
    return this.toRoomResponse(newRoom);
  }

  findOne(roomId: string): RoomResponse {
    return this.toRoomResponse(this.getRoomOrThrow(roomId));
  }

  async join(roomId: string, userId: string): Promise<RoomResponse> {
    const room = this.getRoomOrThrow(roomId);

    if (room.status !== 'WAITING') {
      throw new ConflictException('Only waiting rooms can be joined');
    }

    if (room.mode === 'LOCAL_CPU' && room.hostId !== userId) {
      throw new ConflictException('Local CPU rooms cannot be joined');
    }

    // 既に参加している場合はそのまま返す
    if (room.participants[userId]) {
      return this.toRoomResponse(room);
    }

    const currentPlayers = Object.keys(room.participants).length;
    if (currentPlayers >= room.maxPlayers) {
      throw new ConflictException('Room is full');
    }

    // ユーザー情報の取得
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const participant: RoomParticipant = {
      userId,
      username: user.displayName ?? user.email,
      avatarUrl: user.avatarUrl,
      isHost: false,
      isReady: false,
      joinedAt: new Date(),
    };

    this.roomsState.addParticipant(roomId, participant);
    return this.toRoomResponse(room);
  }

  leave(roomId: string, userId: string) {
    const room = this.getRoomOrThrow(roomId);

    if (room.status !== 'WAITING') {
      throw new ConflictException('Only waiting rooms can be left');
    }

    const participant = room.participants[userId];
    if (!participant) {
      throw new ForbiddenException('You are not a participant of this room');
    }

    // 参加者を削除
    this.roomsState.removeParticipant(roomId, userId);

    const remainingParticipants = Object.values(room.participants);

    // ホストが退出した場合の処理
    if (participant.isHost) {
      if (remainingParticipants.length === 0) {
        this.roomsState.deleteRoom(roomId);
        return { deleted: true as const, roomId };
      }

      // 残っている参加者の中で一番古く入室した人を次のホストにする
      remainingParticipants.sort(
        (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
      );
      const nextHost = remainingParticipants[0];

      nextHost.isHost = true;
      nextHost.isReady = true;
      room.hostId = nextHost.userId;
      room.updatedAt = new Date();
    }

    return this.toRoomResponse(room);
  }

  setReady(roomId: string, userId: string, isReady: boolean): RoomResponse {
    const room = this.getRoomOrThrow(roomId);

    if (room.status !== 'WAITING') {
      throw new ConflictException('Ready can only be changed in waiting rooms');
    }

    const participant = room.participants[userId];
    if (!participant) {
      throw new ForbiddenException('You are not a participant of this room');
    }

    if (participant.isHost && !isReady) {
      throw new BadRequestException('Host is always ready');
    }

    this.roomsState.updateParticipantReadyState(
      roomId,
      userId,
      participant.isHost ? true : isReady,
    );

    return this.toRoomResponse(room);
  }

  start(roomId: string, userId: string): RoomResponse {
    const room = this.getRoomOrThrow(roomId);

    if (room.status !== 'WAITING') {
      throw new ConflictException('Only waiting rooms can be started');
    }

    const participant = room.participants[userId];
    if (!participant) {
      throw new ForbiddenException('You are not a participant of this room');
    }

    if (!participant.isHost) {
      throw new ForbiddenException('Only the host can start the room');
    }

    this.assertStartable(room);

    this.roomsState.updateRoomStatus(roomId, 'PLAYING');
    room.startedAt = new Date();

    return this.toRoomResponse(room);
  }

  // 他のサービスからルームの存在確認等に使用
  getRoomOrThrow(roomId: string): Room {
    const room = this.roomsState.getRoom(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  // --- Private Helpers ---

  private toRoomResponse(room: Room): RoomResponse {
    const participants = Object.values(room.participants).sort(
      (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
    );

    // ホストの情報を特定
    const host = room.participants[room.hostId];

    return {
      id: room.id,
      gameId: room.gameId,
      name: room.name,
      hostId: room.hostId,
      hostName: host ? host.username : 'Unknown',
      maxPlayers: room.maxPlayers,
      status: this.toStatusResponse(room.status),
      mode: this.toModeResponse(room.mode),
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      startedAt: room.startedAt,
      finishedAt: room.finishedAt,
      players: participants.map((p) => ({
        userId: p.userId,
        username: p.username,
        avatarUrl: p.avatarUrl,
        isReady: p.isReady,
        isHost: p.isHost,
        joinedAt: p.joinedAt,
      })),
    };
  }

  private toStatusResponse(status: RoomStatus): RoomStatusResponse {
    if (status === 'WAITING') return 'waiting';
    if (status === 'PLAYING') return 'playing';
    return 'finished';
  }

  private toModeResponse(mode: RoomMode): RoomModeResponse {
    if (mode === 'LOCAL_CPU') return 'local_cpu';
    return 'online';
  }

  private assertStartable(room: Room) {
    const participants = Object.values(room.participants);

    if (room.mode === 'LOCAL_CPU') {
      if (participants.length !== 1) {
        throw new ConflictException(
          'Local CPU rooms must have exactly one human player',
        );
      }
      return;
    }

    if (participants.length !== room.maxPlayers) {
      throw new ConflictException('Room is not full');
    }

    if (!participants.every((item) => item.isReady)) {
      throw new ConflictException('All participants must be ready');
    }
  }
}
