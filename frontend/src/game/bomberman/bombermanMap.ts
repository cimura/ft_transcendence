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
          Math.abs(x - position.x) <= 1 && Math.abs(y - position.z) <= 1
      )
      if (isSpawnSafe) return 'empty'
      if (tile === 'x') {
        return 'breakable'
      }

      const deterministicDensity = (x * 13 + y * 17 + x * y * 7) % 10
      return deterministicDensity < 5 ? 'breakable' : 'empty'
    })
  )

export const getBreakableColor = (x: number, y: number) =>
  BREAKABLE_COLORS[(x * 7 + y * 11) % BREAKABLE_COLORS.length]

export const createInitialBombermanPlayers = (): BombermanPlayer[] => [
  {
    id: 'local-player',
    username: 'You',
    position: { ...startPositions[0] },
    spawn: { ...startPositions[0] },
    color: '#ff8800',
    visorColor: '#00ff00',
    alive: true,
    isLocal: true,
  },
  {
    id: 'npc-1',
    username: 'NPC 1',
    position: { ...startPositions[1] },
    spawn: { ...startPositions[1] },
    color: '#444444',
    visorColor: '#ff0000',
    alive: true,
    isLocal: false,
  },
  {
    id: 'npc-2',
    username: 'NPC 2',
    position: { ...startPositions[2] },
    spawn: { ...startPositions[2] },
    color: '#662222',
    visorColor: '#ff0000',
    alive: true,
    isLocal: false,
  },
  {
    id: 'npc-3',
    username: 'NPC 3',
    position: { ...startPositions[3] },
    spawn: { ...startPositions[3] },
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
    gridX: 1,
    gridY: 1,
    color: '#2563eb',
  },
  {
    id: 'opponent-preview',
    username: 'Opponent',
    gridX: 11,
    gridY: 9,
    color: '#dc2626',
  },
]
