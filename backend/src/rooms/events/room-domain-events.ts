import type { RoomSnapshot } from '@ft_transcendence/shared/rooms-events.types';

export const ROOM_CREATED_EVENT = 'room.created';
export const ROOM_UPDATED_EVENT = 'room.updated';
export const ROOM_DELETED_EVENT = 'room.deleted';

// ルームのドメイン状態が変化するたびに RoomsService が発行するイベント。
// RoomsGateway がこれを購読してクライアントへブロードキャストすることで、
// 「状態変更したのに通知を忘れる/呼び出し元ごとに二重管理する」事故を防ぐ。
export class RoomCreatedEvent {
  constructor(public readonly room: RoomSnapshot) {}
}

export class RoomUpdatedEvent {
  constructor(public readonly room: RoomSnapshot) {}
}

export class RoomDeletedEvent {
  constructor(public readonly roomId: string) {}
}
