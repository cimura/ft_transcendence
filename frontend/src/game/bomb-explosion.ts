import { EXPLOSION_DURATION_MS } from '../constants/game-constants'
import type { ClientGameState, BombermanExplosion } from '../types/game'
import type { ServerToClientEvents } from '@ft_transcendence/shared/game-events.types'

type ExplodeData = Parameters<ServerToClientEvents['bomb:explode']>[0]

export function computeBombExplosion(
  current: ClientGameState,
  data: ExplodeData
): ClientGameState {
  const newBombs = { ...current.bombs }
  delete newBombs[data.bombId]

  const newMap = [...current.map]
  data.destroyedBlocks.forEach((pos) => {
    newMap[pos.y] = [...newMap[pos.y]]
    newMap[pos.y][pos.x] = 'empty'
  })

  const newPlayers = { ...current.players }
  data.damagedPlayerIds.forEach((pid) => {
    if (newPlayers[pid]) {
      newPlayers[pid] = { ...newPlayers[pid], alive: false }
    }
  })

  const explosion: BombermanExplosion = {
    id: `exp_${Date.now()}_${Math.random()}`,
    cells: data.affectedTiles,
    expiresAt: Date.now() + EXPLOSION_DURATION_MS,
  }

  return {
    ...current,
    map: newMap,
    bombs: newBombs,
    players: newPlayers,
    explosions: [...current.explosions, explosion],
  }
}
