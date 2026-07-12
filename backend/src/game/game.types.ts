import type {
  Direction,
  TileType,
  GamePhase,
  PlayerSnapshot,
  BombSnapshot,
  PlayerStats,
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
