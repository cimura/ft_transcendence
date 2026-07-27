import { Injectable } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import type { RoomResponse } from '../common/types/room.type';
import type { RoomSnapshot } from '@ft_transcendence/shared/rooms-events.types';

@Injectable()
export class RoomsLobbyService {
  constructor(private readonly roomsService: RoomsService) {}

  // ロビーに一覧表示する対象: 参加受付中(WAITING)かつオンライン対戦のルームのみ
  // (LOCAL_CPU はホスト以外 join できないため一覧から除外する)
  getLobbyRooms(): RoomResponse[] {
    return this.roomsService
      .findAll('waiting')
      .filter((room) => this.isLobbyVisible(room));
  }

  isLobbyVisible(room: RoomResponse): boolean {
    return room.status === 'waiting' && room.mode === 'online';
  }

  toSnapshot(room: RoomResponse): RoomSnapshot {
    return {
      id: room.id,
      gameId: room.gameId,
      name: room.name,
      hostId: room.hostId,
      hostName: room.hostName,
      players: room.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        avatarUrl: p.avatarUrl,
        isReady: p.isReady,
        isHost: p.isHost,
        joinedAt: p.joinedAt.toISOString(),
      })),
      maxPlayers: room.maxPlayers,
      status: room.status,
      mode: room.mode,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      startedAt: room.startedAt?.toISOString(),
      finishedAt: room.finishedAt?.toISOString(),
    };
  }
}
