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

export interface ChatMessagePayload {
  id: string;
  roomId: string;
  userId?: string;
  username: string;
  text: string;
  createdAt: string;
}

export interface ChatHistoryPayload {
  roomId: string;
  messages: ChatMessagePayload[];
}

export interface ChatErrorPayload {
  message: string;
}

export interface RoomClientToServerEvents {
  "room:join": (data: { roomId: string }) => void;
  "room:leave": () => void;
  "chat:join": (data: { roomId: string }) => void;
  "chat:leave": (data: { roomId: string }) => void;
  "chat:message": (
    data: { roomId: string; text: string },
    callback?: (response: { ok?: boolean; error?: string }) => void,
  ) => void;
}

export interface RoomServerToClientEvents {
  "room:updated": (room: RoomSnapshot) => void;
  "room:deleted": (data: { roomId: string }) => void;
  "room:error": (data: { message: string }) => void;
  "chat:message": (data: ChatMessagePayload) => void;
  "chat:history": (data: ChatHistoryPayload) => void;
  "chat:error": (data: ChatErrorPayload) => void;
}
