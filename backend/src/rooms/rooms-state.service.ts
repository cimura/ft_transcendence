import { Injectable } from '@nestjs/common';
import type {
  Room,
  RoomMessage,
  RoomParticipant,
  RoomStatus,
} from '../common/types/room.type';

export const MAX_MESSAGES_PER_ROOM = 50;

@Injectable()
export class RoomsStateService {
  private readonly rooms = new Map<string, Room>();

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  addRoom(room: Room): void {
    this.rooms.set(room.id, room);
  }

  // 削除の成否を返す
  deleteRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  // 以降の更新メソッドは対象が存在しない場合falseを返すことで、呼び出し元でのエラーハンドリングを促す
  updateRoomStatus(roomId: string, status: RoomStatus): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.status = status;
    room.updatedAt = new Date();
    return true;
  }

  addParticipant(roomId: string, participant: RoomParticipant): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.participants[participant.userId] = participant;
    room.updatedAt = new Date();
    return true;
  }

  removeParticipant(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    delete room.participants[userId];
    room.updatedAt = new Date();
    return true;
  }

  updateParticipantReadyState(
    roomId: string,
    userId: string,
    isReady: boolean,
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room || !room.participants[userId]) return false;

    room.participants[userId].isReady = isReady;
    room.updatedAt = new Date();
    return true;
  }

  getRoomMessages(roomId: string): RoomMessage[] {
    return this.rooms.get(roomId)?.messages ?? [];
  }

  addRoomMessage(roomId: string, message: RoomMessage): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.messages.push(message);
    if (room.messages.length > MAX_MESSAGES_PER_ROOM) {
      room.messages.splice(0, room.messages.length - MAX_MESSAGES_PER_ROOM);
    }
    room.updatedAt = new Date();
    return true;
  }
}
