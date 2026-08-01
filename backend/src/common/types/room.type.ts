import type { GameSession } from './game.type';
import type {
  RoomStatus,
  RoomMaxPlayers,
} from '@ft_transcendence/shared/rooms-events.types';

export interface RoomParticipant {
  userId: string;
  username: string;
  avatarUrl: string | null;
  isHost: boolean;
  isReady: boolean;
  joinedAt: Date;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  content: string;
  createdAt: Date;
}

// 招待作成時点のユーザー情報のスナップショット(RoomMessage の senderName と同じ発想の非正規化)
export interface RoomInvitationUserSnapshot {
  id: string;
  username: string; // User.username カラム(通知の actor.username 用)
  avatarUrl: string | null;
}

export interface RoomInvitation {
  id: string;
  roomId: string;
  inviterId: string;
  inviteeId: string;
  inviter: RoomInvitationUserSnapshot;
  invitee: RoomInvitationUserSnapshot;
  createdAt: Date;
}

export interface Room {
  id: string;
  gameId: string;
  name: string;
  hostId: string;
  maxPlayers: RoomMaxPlayers;
  status: RoomStatus;

  participants: Record<string, RoomParticipant>;
  messages: RoomMessage[];
  // key: inviteeId(存在すれば pending。accept/decline で削除される)
  invitations: Record<string, RoomInvitation>;

  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;

  // ゲーム進行中の詳細情報
  gameSession?: GameSession;
}
