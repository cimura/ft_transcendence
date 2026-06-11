import type {
  BombermanMap,
  BombermanPlayer,
  WorldPosition,
} from './bombermanTypes'

const MAP_PATTERN = [
  '.........',
  '.#x#x#x#.',
  '..x...x..',
  '.#x#.#x#.',
  '...x.x...',
  '.#x#.#x#.',
  '..x...x..',
  '.#x#x#x#.',
  '.........',
]

const SPAWN_SAFE_RADIUS = 1
const DENSITY_X_WEIGHT = 13
const DENSITY_Y_WEIGHT = 17
const DENSITY_DIAGONAL_WEIGHT = 7
const DENSITY_BUCKET_COUNT = 10
const DENSITY_BREAKABLE_THRESHOLD = 5
const BREAKABLE_COLOR_X_WEIGHT = 7
const BREAKABLE_COLOR_Y_WEIGHT = 11
const LOCAL_PLAYER_START_INDEX = 0
const NPC_ONE_START_INDEX = 1
const NPC_TWO_START_INDEX = 2
const NPC_THREE_START_INDEX = 3

export const BOMBERMAN_TILE_SIZE = 40
export const BOMBERMAN_GRID_SIZE = 9
export const BOMBERMAN_CELL_SIZE = 1
export const BOMB_TIMER_MS = 2000
export const EXPLOSION_DURATION_MS = 500
export const SMOKE_DURATION_MS = 1000
export const PLAYER_SPEED = 3.5
export const NPC_SPEED_MULTIPLIER = 1.18
export const NPC_ATTACK_RANGE = 4
export const NPC_BOMB_COOLDOWN_MS = 900
export const BLAST_RANGE = 2
export const BREAKABLE_COLORS = [
  '#00ffff',
  '#ff00ff',
  '#ffff00',
  '#00ff88',
  '#ff5500',
]

export const startPositions: WorldPosition[] = [
  { x: 0, z: 0 },
  { x: BOMBERMAN_GRID_SIZE - 1, z: BOMBERMAN_GRID_SIZE - 1 },
  { x: BOMBERMAN_GRID_SIZE - 1, z: 0 },
  { x: 0, z: BOMBERMAN_GRID_SIZE - 1 },
]

export const createInitialBombermanMap = (): BombermanMap =>
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

// Coprime weights keep color choices stable while avoiding obvious grid stripes.
export const getBreakableColor = (x: number, y: number) =>
  BREAKABLE_COLORS[
    (x * BREAKABLE_COLOR_X_WEIGHT + y * BREAKABLE_COLOR_Y_WEIGHT) %
      BREAKABLE_COLORS.length
  ]

export const createInitialBombermanPlayers = (): BombermanPlayer[] => [
  {
    id: 'local-player',
    username: 'You',
    position: { ...startPositions[LOCAL_PLAYER_START_INDEX] },
    spawn: { ...startPositions[LOCAL_PLAYER_START_INDEX] },
    color: '#ff8800',
    visorColor: '#00ff00',
    alive: true,
    isLocal: true,
  },
  {
    id: 'npc-1',
    username: 'NPC 1',
    position: { ...startPositions[NPC_ONE_START_INDEX] },
    spawn: { ...startPositions[NPC_ONE_START_INDEX] },
    color: '#444444',
    visorColor: '#ff0000',
    alive: true,
    isLocal: false,
  },
  {
    id: 'npc-2',
    username: 'NPC 2',
    position: { ...startPositions[NPC_TWO_START_INDEX] },
    spawn: { ...startPositions[NPC_TWO_START_INDEX] },
    color: '#662222',
    visorColor: '#ff0000',
    alive: true,
    isLocal: false,
  },
  {
    id: 'npc-3',
    username: 'NPC 3',
    position: { ...startPositions[NPC_THREE_START_INDEX] },
    spawn: { ...startPositions[NPC_THREE_START_INDEX] },
    color: '#222266',
    visorColor: '#ff0000',
    alive: true,
    isLocal: false,
  },
]

export const initialPlayers = [
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
