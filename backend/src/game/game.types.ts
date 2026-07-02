import type {
  Direction,
  TileType,
  GamePhase,
  PlayerSnapshot,
  BombSnapshot,
  PlayerStats,
} from '@ft_transcendence/shared/game-events.types';

export interface GameSession {
  roomId: string;
  phase: GamePhase;
  mapRevision: number;
  map: TileType[][];
  players: Record<string, PlayerSnapshot>;
  bombs: Record<string, BombSnapshot>;
  serverTick: number;
  timerId?: NodeJS.Timeout;
  countdownTimerId?: NodeJS.Timeout;
  playerInputs: Record<string, { direction: Direction | null; seq: number }>;
  bombPassingPlayers: Record<string, string[]>;
  stats: Record<string, PlayerStats>;
  startedAt?: number;
}
