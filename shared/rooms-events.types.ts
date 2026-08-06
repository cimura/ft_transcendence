export type RoomStatus = "waiting" | "playing" | "finished";
export type RoomMaxPlayers = 2 | 3 | 4;

export type RoomPlayer = {
  userId: string;
  username: string;
  avatarUrl?: string | undefined;
  isReady: boolean;
  isHost: boolean;
};

export type RoomSnapshot = {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  players: RoomPlayer[];
  maxPlayers: RoomMaxPlayers;
  status: RoomStatus;
  mapId?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  startedAt?: Date | string | null;
  finishedAt?: Date | string | null;
};

// ルーム削除の通知。broadcast されるため、受信側は「どのルームが消えたか」を
// この payload からしか知り得ない。
export type RoomDeletedPayload = {
  roomId: string;
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
  "lobby:join": () => void;
  "chat:join": (data: { roomId: string }) => void;
  "chat:leave": (data: { roomId: string }) => void;
  "chat:message": (
    data: { roomId: string; text: string },
    callback?: (response: { ok?: boolean; error?: string }) => void,
  ) => void;
}

// 切断からの猶予時間内にロビーへ戻ってきたユーザーに、元いたルームへの
// 復帰先を知らせるための payload。inGame は遷移先の判断にのみ使う。
export type RoomRejoinPayload = {
  room: RoomSnapshot;
  inGame: boolean;
};

export interface RoomServerToClientEvents {
  "room:created": (room: RoomSnapshot) => void;
  "room:updated": (room: RoomSnapshot) => void;
  "room:deleted": (data: RoomDeletedPayload) => void;
  "room:error": (data: { message: string }) => void;
  "room:rejoin": (data: RoomRejoinPayload) => void;
  "lobby:rooms": (rooms: RoomSnapshot[]) => void;
  "chat:message": (data: ChatMessagePayload) => void;
  "chat:history": (data: ChatHistoryPayload) => void;
  "chat:error": (data: ChatErrorPayload) => void;
}
