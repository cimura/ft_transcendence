import { Socket } from 'socket.io';
import type {
  Direction,
  TileType,
  GamePhase,
  PlayerSnapshot,
  BombSnapshot,
  PlayerStats,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@ft_transcendence/shared/game-events.types';

export interface PlayerConnection {
  clientId: string; // 現在プレイヤーが使用しているWebSocketのID
  lastActiveTime: number;
}

export interface GameSession {
  roomId: string;
  phase: GamePhase;
  map: TileType[][];
  players: Record<string, PlayerSnapshot>;
  bombs: Record<string, BombSnapshot>;
  serverTick: number;
  timerId?: NodeJS.Timeout;
  countdownTimerId?: NodeJS.Timeout;
  playerInputs: Record<string, { direction: Direction | null; seq: number }>;
  bombPassingPlayers: Record<string, string[]>;
  startPositionSlots: (string | null)[];
  stats: Record<string, PlayerStats>;
  playerConnections: Record<string, PlayerConnection>;
  disconnectedPlayers: number;
  disconnectedAt: number;
  startedAt?: number;
}

// websocket client.dataに保持するもの
export interface ConnectionData {
  user: {
    id: string;
  };
  roomId?: string;
}

// websocket clientの型
export type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  ConnectionData
>;
