import {
  MAP_PATTERN,
  BOMBERMAN_GRID_SIZE,
} from '../../../constants/game-constants'
import type {
  TileType,
  WorldPosition,
} from '@ft_transcendence/shared/game-events.types'

// 部屋でマップのプレビューを表示するためのモック (ゲームがスタートしてからでないと情報を得られないため)

const SPAWN_SAFE_RADIUS = 1
const DENSITY_X_WEIGHT = 13
const DENSITY_Y_WEIGHT = 17
const DENSITY_DIAGONAL_WEIGHT = 7
const DENSITY_BUCKET_COUNT = 10
const DENSITY_BREAKABLE_THRESHOLD = 5
const LOCAL_PLAYER_START_INDEX = 0
const NPC_ONE_START_INDEX = 1

export const BOMBERMAN_CELL_SIZE = 1
export const SMOKE_DURATION_MS = 1000
export const PLAYER_SPEED = 3.5
export const NPC_SPEED_MULTIPLIER = 1.18
export const NPC_ATTACK_RANGE = 4
export const NPC_BOMB_COOLDOWN_MS = 900

export const startPositions: WorldPosition[] = [
  { x: 0, z: 0 },
  { x: BOMBERMAN_GRID_SIZE - 1, z: BOMBERMAN_GRID_SIZE - 1 },
  { x: BOMBERMAN_GRID_SIZE - 1, z: 0 },
  { x: 0, z: BOMBERMAN_GRID_SIZE - 1 },
]

export const createInitialBombermanMap = (): TileType[][] =>
  MAP_PATTERN.map((row, y) =>
    [...row].map((tile, x) => {
      if (tile === '#') return 'solid'
      const isSpawnSafe = startPositions.some(
        (position) =>
          Math.abs(x - position.x) <= SPAWN_SAFE_RADIUS &&
          Math.abs(y - position.z) <= SPAWN_SAFE_RADIUS
      )
      if (isSpawnSafe) return 'empty'
      if (tile === 'x') {
        return 'breakable'
      }

      const deterministicDensity =
        (x * DENSITY_X_WEIGHT +
          y * DENSITY_Y_WEIGHT +
          x * y * DENSITY_DIAGONAL_WEIGHT) %
        DENSITY_BUCKET_COUNT
      return deterministicDensity < DENSITY_BREAKABLE_THRESHOLD
        ? 'breakable'
        : 'empty'
    })
  )

export type BombermanPlayerPreview = {
  id: string
  username: string
  gridX: number
  gridY: number
  color: string
}

export const initialPlayers: BombermanPlayerPreview[] = [
  {
    id: 'local-player',
    username: 'You',
    gridX: startPositions[LOCAL_PLAYER_START_INDEX].x,
    gridY: startPositions[LOCAL_PLAYER_START_INDEX].z,
    color: '#2563eb',
  },
  {
    id: 'opponent-preview',
    username: 'Opponent',
    gridX: startPositions[NPC_ONE_START_INDEX].x,
    gridY: startPositions[NPC_ONE_START_INDEX].z,
    color: '#dc2626',
  },
]
