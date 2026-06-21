export type TileType = 'empty' | 'solid' | 'breakable'

export type Direction = 'up' | 'down' | 'left' | 'right'

export type GameStatus = 'playing' | 'win' | 'lose' | 'draw'

export type BombermanInput =
  | { type: 'move'; direction: Direction }
  | { type: 'stop' }
  | { type: 'place_bomb' }

export type BombermanMap = TileType[][]

export type GridPosition = {
  x: number
  y: number
}

export type WorldPosition = {
  x: number
  z: number
}

export type BombermanPlayer = {
  id: string
  username: string
  position: WorldPosition
  spawn: WorldPosition
  color: string
  visorColor: string
  alive: boolean
  isLocal: boolean
}

export type BombermanBomb = {
  id: string
  ownerId: string
  position: GridPosition
  placedAt: number
  explodesAt: number
  blastRange: number
}

export type BombermanExplosion = {
  id: string
  cells: GridPosition[]
  expiresAt: number
}

export type BombermanSmoke = {
  id: string
  position: GridPosition
  color: string
  expiresAt: number
}

export type BombermanGameState = {
  map: BombermanMap
  players: Record<string, BombermanPlayer>
  bombs: Record<string, BombermanBomb>
  explosions: BombermanExplosion[]
  smokes: BombermanSmoke[]
  winnerId?: string
}

export type BombermanPlayerPreview = {
  id: string
  username: string
  gridX: number
  gridY: number
  color: string
}
