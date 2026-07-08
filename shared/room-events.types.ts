export type RoomStatus = "waiting" | "playing" | "finished";
export type RoomMode = "online" | "local_cpu";

export type RoomPlayer = {
  userId: string;
  username: string;
  avatarUrl?: string | null;
  isReady: boolean;
  isHost: boolean;
  joinedAt?: Date | string;
};

export type RoomSnapshot = {
  id: string;
  gameId?: string;
  name: string;
  hostId: string;
  hostName: string;
  players: RoomPlayer[];
  maxPlayers: number;
  status: RoomStatus;
  mode?: RoomMode;
  mapId?: string;
  settingsSnapshot?: unknown;
  createdAt: Date | string;
  updatedAt?: Date | string;
  startedAt?: Date | string | null;
  finishedAt?: Date | string | null;
};

export interface RoomClientToServerEvents {
  "room:join": (data: { roomId: string }) => void;
  "room:leave": () => void;
}

export interface RoomServerToClientEvents {
  "room:updated": (room: RoomSnapshot) => void;
  "room:deleted": (data: { roomId: string }) => void;
  "room:error": (data: { message: string }) => void;
}
