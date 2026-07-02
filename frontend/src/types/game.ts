import type {
  Direction,
  TileType,
  GridPosition,
  PlayerSnapshot,
  BombSnapshot,
} from '@ft_transcendence/shared/game-events.types'

export type BombermanInput =
  | { type: 'move'; direction: Direction }
  | { type: 'stop' }
  | { type: 'place_bomb' }

export type ActiveControl = Direction | 'bomb' | null

export type BombermanExplosion = {
  id: string
  cells: GridPosition[]
  expiresAt: number
}

export type ClientGameState = {
  map: TileType[][]
  players: Record<string, PlayerSnapshot>
  bombs: Record<string, BombSnapshot>
  explosions: BombermanExplosion[]
}
