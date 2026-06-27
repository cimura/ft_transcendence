export type Direction = "up" | "down" | "left" | "right";

export type GridPosition = {
  x: number;
  y: number;
};

export type WorldPosition = {
  x: number;
  z: number;
};

export type TileType = "empty" | "solid" | "breakable";

export type GamePhase = "waiting" | "countdown" | "playing" | "ended";

export type PlayerSnapshot = {
  id: string;
  username: string;
  position: WorldPosition;
  direction: Direction;
  alive: boolean;
  score: number;
  color: string;
  visorColor: string;
};

export type BombSnapshot = {
  id: string;
  ownerId: string;
  position: GridPosition;
  explodesAt: number;
  blastRange: number;
};

export interface PlayerStats {
  blocksDestroyed: number;
  bombsPlaced: number;
  kills: number;
  survivalTime: number;
}

export interface ClientToServerEvents {
  "game:join": (data: { roomId: string }) => void;
  "game:leave": () => void;

  "player:input": (data: {
    direction: Direction | null;
    seq: number;
    clientTime: number;
  }) => void;

  "bomb:place": (data: { seq: number; clientTime: number }) => void;
}

export interface ServerToClientEvents {
  "game:init": (data: {
    yourId: string;
    serverTime: number;
    mapRevision: number;
    map: TileType[][];
    players: Record<string, PlayerSnapshot>;
    bombs: Record<string, BombSnapshot>;
    phase: GamePhase;
  }) => void;

  "game:countdown": (data: { seconds: number; startsAt: number }) => void;
  "game:start": (data: { serverTime: number }) => void;

  "game:state": (data: {
    serverTick: number;
    serverTime: number;
    mapRevision: number;
    players: Record<string, PlayerSnapshot>;
    bombs: Record<string, BombSnapshot>;
  }) => void;

  "bomb:spawn": (data: { bomb: BombSnapshot }) => void;

  "bomb:explode": (data: {
    bombId: string;
    affectedTiles: GridPosition[];
    destroyedBlocks: GridPosition[];
    damagedPlayerIds: string[];
    mapRevision: number;
  }) => void;

  "game:end": (data: {
    winnerId: string | null;
    isDraw: boolean;
    rankings: Record<string, PlayerStats>;
  }) => void;

  "game:error": (data: { code: string; message: string }) => void;
}
