import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import { GamesService } from '../games/games.service';
import { RoomsStateService } from './rooms-state.service';
import { BOMBERMAN_GAME_ID } from '../games/games.constants';
import { CreateRoomDto } from './dto/create-room.dto';
import type { QueryRoomStatus } from './dto/query-rooms.dto';
import type { Room, RoomParticipant } from '../common/types/room.type';
import type { RoomSnapshot } from '@ft_transcendence/shared/rooms-events.types';
import {
  ROOM_CREATED_EVENT,
  ROOM_UPDATED_EVENT,
  ROOM_DELETED_EVENT,
  RoomCreatedEvent,
  RoomUpdatedEvent,
  RoomDeletedEvent,
} from './events/room-domain-events';

type JoinRejectionReason = 'not_waiting' | 'full' | null;

const JOIN_REJECTION_MESSAGES: Record<
  Exclude<JoinRejectionReason, null>,
  string
> = {
  not_waiting: 'Only waiting rooms can be joined',
  full: 'Room is full',
};

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamesService: GamesService,
    private readonly roomsState: RoomsStateService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  findAll(status?: QueryRoomStatus): RoomSnapshot[] {
    let rooms = this.roomsState.getAllRooms();

    if (status) {
      rooms = rooms.filter((room) => room.status === status);
    }

    // 作成日時の降順でソート
    rooms.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return rooms.map((room) => this.toRoomSnapshot(room));
  }

  async create(userId: string, dto: CreateRoomDto): Promise<RoomSnapshot> {
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

    const hostParticipant: RoomParticipant = {
      userId,
      username: user.username,
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
      status: 'waiting',
      participants: {
        [userId]: hostParticipant,
      },
      messages: [],
      invitations: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.roomsState.addRoom(newRoom);
    const snapshot = this.toRoomSnapshot(newRoom);
    this.eventEmitter.emit(ROOM_CREATED_EVENT, new RoomCreatedEvent(snapshot));
    return snapshot;
  }

  findOne(roomId: string): RoomSnapshot {
    return this.toRoomSnapshot(this.getRoomOrThrow(roomId));
  }

  async join(roomId: string, userId: string): Promise<RoomSnapshot> {
    const room = this.getRoomOrThrow(roomId);

    // 既に参加している場合はそのまま返す
    if (room.participants[userId]) {
      return this.emitRoomUpdated(room);
    }

    this.assertJoinable(room);

    // await を伴うユーザー取得を先に行う
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const currentRoom = this.getRoomOrThrow(roomId);
    // await 後に同期的に再チェックしてから追加し、同時 join による定員超過を防ぐ
    if (currentRoom.participants[userId]) {
      return this.emitRoomUpdated(currentRoom);
    }
    this.assertJoinable(currentRoom);

    const participant: RoomParticipant = {
      userId,
      username: user.username,
      avatarUrl: user.avatarUrl,
      isHost: false,
      isReady: false,
      joinedAt: new Date(),
    };

    this.roomsState.addParticipant(roomId, participant);
    return this.emitRoomUpdated(currentRoom);
  }

  leave(roomId: string, userId: string): RoomSnapshot | null {
    const room = this.getRoomOrThrow(roomId);

    if (room.status !== 'waiting') {
      throw new ConflictException('Only waiting rooms can be left');
    }

    const participant = room.participants[userId];
    if (!participant) {
      throw new ForbiddenException('You are not a participant of this room');
    }

    // 参加者を削除
    this.roomsState.removeParticipant(roomId, userId);

    const remainingParticipants = Object.values(room.participants);

    // 空室のルームは削除する。
    if (remainingParticipants.length === 0) {
      this.roomsState.deleteRoom(roomId);
      this.eventEmitter.emit(ROOM_DELETED_EVENT, new RoomDeletedEvent(roomId));
      return null;
    }

    // ホストが退出した場合の処理
    if (participant.isHost) {
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

    return this.emitRoomUpdated(room);
  }

  setReady(roomId: string, userId: string, isReady: boolean): RoomSnapshot {
    const room = this.getRoomOrThrow(roomId);

    if (room.status !== 'waiting') {
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

    return this.emitRoomUpdated(room);
  }

  start(roomId: string, userId: string): RoomSnapshot {
    const room = this.getRoomOrThrow(roomId);

    if (room.status !== 'waiting') {
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

    this.roomsState.updateRoomStatus(roomId, 'playing');
    room.startedAt = new Date();

    return this.emitRoomUpdated(room);
  }

  // 他のサービスからルームの存在確認等に使用
  getRoomOrThrow(roomId: string): Room {
    const room = this.roomsState.getRoom(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  // Socket購読の認可。REST の /join と socket の room:join は並行に呼ばれ得るため、
  // 「既に参加済み」または「これから参加できる」のどちらかであれば購読を許可する。
  canSubscribe(roomId: string, userId: string): boolean {
    const room = this.getRoomOrThrow(roomId);
    return (
      Boolean(room.participants[userId]) || this.checkJoinable(room) === null
    );
  }

  // 猶予時間内に再接続がなかった参加者を自動退出させる。
  // 既に退出済み/ゲーム開始済みなら何もしない(呼び出し側が遅延実行するため正常系)。
  evictIfWaiting(roomId: string, userId: string): void {
    const room = this.roomsState.getRoom(roomId);
    if (!room || room.status !== 'waiting' || !room.participants[userId]) {
      return;
    }
    this.leave(roomId, userId);
  }

  // --- Private Helpers ---

  // 参加を拒否する理由コード。null なら参加可能。
  // join() の例外送出と canSubscribe() の真偽判定で共用する。
  private checkJoinable(room: Room): JoinRejectionReason {
    if (room.status !== 'waiting') {
      return 'not_waiting';
    }
    if (Object.keys(room.participants).length >= room.maxPlayers) {
      return 'full';
    }
    return null;
  }

  private assertJoinable(room: Room): void {
    const reason = this.checkJoinable(room);
    if (reason) {
      throw new ConflictException(JOIN_REJECTION_MESSAGES[reason]);
    }
  }

  private emitRoomUpdated(room: Room): RoomSnapshot {
    const snapshot = this.toRoomSnapshot(room);
    this.eventEmitter.emit(ROOM_UPDATED_EVENT, new RoomUpdatedEvent(snapshot));
    return snapshot;
  }

  private toRoomSnapshot(room: Room): RoomSnapshot {
    const participants = Object.values(room.participants).sort(
      (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
    );

    // ホストの情報を特定
    const host = room.participants[room.hostId];

    return {
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      hostName: host ? host.username : 'Unknown',
      maxPlayers: room.maxPlayers,
      status: room.status,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      startedAt: room.startedAt,
      finishedAt: room.finishedAt,
      players: participants.map((p) => ({
        userId: p.userId,
        username: p.username,
        avatarUrl: p.avatarUrl ? p.avatarUrl : undefined,
        isReady: p.isReady,
        isHost: p.isHost,
      })),
    };
  }

  private assertStartable(room: Room) {
    const participants = Object.values(room.participants);

    if (participants.length !== room.maxPlayers) {
      throw new ConflictException('Room is not full');
    }

    if (!participants.every((item) => item.isReady)) {
      throw new ConflictException('All participants must be ready');
    }
  }
}
