import type { BombermanMap } from './bombermanTypes'

const MAP_PATTERN = [
  '#############',
  '#..x...x...x#',
  '#.#.#.#.#.#.#',
  '#x...x...x..#',
  '#.#.#.#.#.#.#',
  '#..x...x...x#',
  '#.#.#.#.#.#.#',
  '#x...x...x..#',
  '#.#.#.#.#.#.#',
  '#..x...x...x#',
  '#############',
]

export const BOMBERMAN_TILE_SIZE = 40

export const createInitialBombermanMap = (): BombermanMap =>
  MAP_PATTERN.map((row) =>
    [...row].map((tile) => {
      if (tile === '#') return 'solid'
      if (tile === 'x') return 'breakable'
      return 'empty'
    })
  )

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
