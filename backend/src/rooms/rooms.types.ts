import { Prisma } from '../generated/prisma/client';
import { RoomMode, RoomStatus } from '../generated/prisma/enums';
import { CreateRoomDto } from './dto/create-room.dto';

export type RoomStatusResponse = 'waiting' | 'playing' | 'finished';
export type RoomModeResponse = 'online' | 'local_cpu';
export type CreateRoomMode = NonNullable<CreateRoomDto['mode']>;

export type RoomWithParticipants = {
  id: string;
  gameId: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  status: RoomStatus;
  mode: RoomMode;
  settingsSnapshot: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  host: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  participants: Array<{
    userId: string;
    isHost: boolean;
    isReady: boolean;
    joinedAt: Date;
    user: {
      id: string;
      email: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
  }>;
};

export type RoomResponse = {
  id: string;
  gameId: string;
  name: string;
  hostId: string;
  hostName: string;
  maxPlayers: number;
  status: RoomStatusResponse;
  mode: RoomModeResponse;
  settingsSnapshot: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  players: Array<{
    userId: string;
    username: string;
    avatarUrl: string | null;
    isReady: boolean;
    isHost: boolean;
    joinedAt: Date;
  }>;
};
