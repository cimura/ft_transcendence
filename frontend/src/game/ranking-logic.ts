import type { PlayerStats } from '@ft_transcendence/shared/game-events.types'

export const sortRankings = (
  entryA: [string, PlayerStats],
  entryB: [string, PlayerStats]
) => {
  const [, statsA] = entryA
  const [, statsB] = entryB

  if (statsB.alive !== statsA.alive) return statsB.alive ? 1 : -1
  if (statsB.survivalTime !== statsA.survivalTime)
    return statsB.survivalTime - statsA.survivalTime
  if (statsB.kills !== statsA.kills) return statsB.kills - statsA.kills
  if (statsB.blocksDestroyed !== statsA.blocksDestroyed)
    return statsB.blocksDestroyed - statsA.blocksDestroyed
  return statsB.bombsPlaced - statsA.bombsPlaced
}
