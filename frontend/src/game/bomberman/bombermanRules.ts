import { BLAST_RANGE, BOMBERMAN_GRID_SIZE } from './bombermanMap'
import type {
  BombermanBomb,
  BombermanMap,
  Direction,
  GridPosition,
  WorldPosition,
} from './bombermanTypes'

const PLAYER_COLLISION_RADIUS = 0.32
const MAP_MIN_WORLD_POSITION = -0.2
const MAP_MAX_WORLD_POSITION = BOMBERMAN_GRID_SIZE - 0.8

const directionVectors: Record<Direction, { x: number; z: number }> = {
  up: { x: 0, z: -1 },
  down: { x: 0, z: 1 },
  left: { x: -1, z: 0 },
  right: { x: 1, z: 0 },
}

export const directionToVector = (direction: Direction) =>
  directionVectors[direction]

export const worldToGrid = (position: WorldPosition): GridPosition => ({
  x: Math.round(position.x),
  y: Math.round(position.z),
})

export const gridToWorld = (position: GridPosition): WorldPosition => ({
  x: position.x,
  z: position.y,
})

export const isInsideMap = (position: GridPosition) =>
  position.x >= 0 &&
  position.x < BOMBERMAN_GRID_SIZE &&
  position.y >= 0 &&
  position.y < BOMBERMAN_GRID_SIZE

export const getTile = (map: BombermanMap, position: GridPosition) => {
  if (!isInsideMap(position)) return 'solid'
  return map[position.y]?.[position.x] ?? 'solid'
}

export const sameCell = (a: GridPosition, b: GridPosition) =>
  a.x === b.x && a.y === b.y

export const isBlockedCell = (
  map: BombermanMap,
  position: GridPosition,
  bombs: BombermanBomb[] = []
) =>
  getTile(map, position) !== 'empty' ||
  bombs.some((bomb) => sameCell(bomb.position, position))

export const getCollisionCells = (position: WorldPosition) => {
  const candidates = [
    {
      x: position.x - PLAYER_COLLISION_RADIUS,
      z: position.z - PLAYER_COLLISION_RADIUS,
    },
    {
      x: position.x + PLAYER_COLLISION_RADIUS,
      z: position.z - PLAYER_COLLISION_RADIUS,
    },
    {
      x: position.x - PLAYER_COLLISION_RADIUS,
      z: position.z + PLAYER_COLLISION_RADIUS,
    },
    {
      x: position.x + PLAYER_COLLISION_RADIUS,
      z: position.z + PLAYER_COLLISION_RADIUS,
    },
  ]

  return candidates.map(worldToGrid)
}

export const isColliding = (
  map: BombermanMap,
  position: WorldPosition,
  bombs: BombermanBomb[],
  ignoredBombId?: string
) => {
  if (
    position.x < MAP_MIN_WORLD_POSITION ||
    position.x > MAP_MAX_WORLD_POSITION ||
    position.z < MAP_MIN_WORLD_POSITION ||
    position.z > MAP_MAX_WORLD_POSITION
  ) {
    return true
  }

  return getCollisionCells(position).some((cell) => {
    if (getTile(map, cell) !== 'empty') return true

    return bombs.some((bomb) => {
      if (bomb.id === ignoredBombId) return false
      return sameCell(bomb.position, cell)
    })
  })
}

export const calculateBlastCells = (
  map: BombermanMap,
  origin: GridPosition,
  range = BLAST_RANGE
) => {
  const cells: GridPosition[] = [origin]
  const vectors = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ]

  vectors.forEach((vector) => {
    for (let distance = 1; distance <= range; distance += 1) {
      const cell = {
        x: origin.x + vector.x * distance,
        y: origin.y + vector.y * distance,
      }
      const tile = getTile(map, cell)

      if (tile === 'solid') break

      cells.push(cell)

      if (tile === 'breakable') break
    }
  })

  return cells
}

export const isInBlast = (position: WorldPosition, cells: GridPosition[]) => {
  const grid = worldToGrid(position)
  return cells.some((cell) => sameCell(cell, grid))
}
