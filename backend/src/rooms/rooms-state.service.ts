import { Injectable } from '@nestjs/common';
import type {
  Room,
  RoomInvitation,
  RoomMessage,
  RoomParticipant,
} from '../common/types/room.type';
import type { RoomStatus } from '@ft_transcendence/shared/rooms-events.types';

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
    // 別経路(招待以外)で入室した場合も含め、招待済みなら消費しておく
    delete room.invitations[participant.userId];
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

  addInvitation(roomId: string, invitation: RoomInvitation): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.invitations[invitation.inviteeId] = invitation;
    room.updatedAt = new Date();
    return true;
  }

  removeInvitation(roomId: string, inviteeId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    delete room.invitations[inviteeId];
    room.updatedAt = new Date();
    return true;
  }

  // invitationId から招待とそれが属するルームを探す(全ルーム走査)
  getInvitation(
    invitationId: string,
  ): { room: Room; invitation: RoomInvitation } | undefined {
    for (const room of this.rooms.values()) {
      const invitation = Object.values(room.invitations).find(
        (candidate) => candidate.id === invitationId,
      );
      if (invitation) {
        return { room, invitation };
      }
    }
    return undefined;
  }

  // 特定ユーザー宛の招待を全ルームから収集する(通知用)
  getInvitationsForInvitee(
    inviteeId: string,
  ): Array<{ room: Room; invitation: RoomInvitation }> {
    const results: Array<{ room: Room; invitation: RoomInvitation }> = [];
    for (const room of this.rooms.values()) {
      const invitation = room.invitations[inviteeId];
      if (invitation) {
        results.push({ room, invitation });
      }
    }
    return results;
  }
}
