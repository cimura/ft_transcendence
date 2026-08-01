import { Injectable } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import type { RoomSnapshot } from '@ft_transcendence/shared/rooms-events.types';

@Injectable()
export class RoomsLobbyService {
  constructor(private readonly roomsService: RoomsService) {}

  // ロビーに一覧表示する対象: 参加受付中(waiting)かつオンライン対戦のルームのみ
  // (local_cpu はホスト以外 join できないため一覧から除外する)
  getLobbyRooms(): RoomSnapshot[] {
    return this.roomsService
      .findAll('waiting')
      .filter((room) => this.isLobbyVisible(room));
  }

  isLobbyVisible(room: RoomSnapshot): boolean {
    return room.status === 'waiting' && room.mode === 'online';
  }
}
