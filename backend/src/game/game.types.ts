import {
  GamePhase,
  TileType,
  PlayerSnapshot,
  BombSnapshot,
  Direction,
} from '@ft_transcendence/shared/game-events.types';

export interface PlayerStats {
  blocksDestroyed: number;
  bombsPlaced: number;
  kills: number;
  survivalTime: number;
}

export interface GameSession {
  roomId: string;
  phase: GamePhase;
  mapRevision: number;
  map: TileType[][];
  players: Record<string, PlayerSnapshot>;
  bombs: Record<string, BombSnapshot>;
  serverTick: number;
  timerId?: NodeJS.Timeout;
  playerInputs: Record<string, { direction: Direction | null; seq: number }>;
  bombPassingPlayers: Record<string, string[]>;
  stats: Record<string, PlayerStats>;
  startedAt?: number;
}
