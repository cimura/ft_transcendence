import type { GameSession } from './game.type';

export type RoomStatus = 'WAITING' | 'PLAYING' | 'FINISHED';

export type RoomMode = 'ONLINE' | 'LOCAL_CPU';

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
  maxPlayers: number;
  status: RoomStatus;
  mode: RoomMode;

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

export type RoomStatusResponse = 'waiting' | 'playing' | 'finished';
export type RoomModeResponse = 'online' | 'local_cpu';

export type RoomResponse = {
  id: string;
  gameId: string;
  name: string;
  hostId: string;
  hostName: string;
  maxPlayers: number;
  status: RoomStatusResponse;
  mode: RoomModeResponse;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  players: Array<{
    userId: string;
    username: string;
    avatarUrl: string | null;
    isReady: boolean;
    isHost: boolean;
    joinedAt: Date;
  }>;
};
