import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { Button } from '../common/Button'
import { useGameStore } from '../../stores/gameStore'
import { sortRankings } from '../../game/ranking-logic'
import type { PlayerStats } from '@ft_transcendence/shared/game-events.types'

const EMPTY_RANKINGS: Record<string, PlayerStats> = {}

export function GameResultOverlay() {
  const navigate = useNavigate()
  const players = useGameStore((state) => state.gameState.players)
  const myPlayerId = useGameStore((state) => state.myPlayerId)
  const resultStats = useGameStore((state) => state.resultStats)
  const errorMessage = useGameStore((state) => state.errorMessage)

  const safeRankings = resultStats?.rankings || EMPTY_RANKINGS

  const sortedRankings = useMemo(() => {
    return Object.entries(safeRankings).sort(sortRankings)
  }, [safeRankings])

  if (!resultStats && !errorMessage) return null

  let displayResult: 'WIN' | 'LOSE' | 'DRAW' | 'ERROR' | null = null
  if (errorMessage) {
    displayResult = 'ERROR'
  } else if (resultStats) {
    if (resultStats.isDraw) {
      displayResult = 'DRAW'
    } else if (resultStats.winnerId === myPlayerId) {
      displayResult = 'WIN'
    } else {
      displayResult = 'LOSE'
    }
  }

  return (
    <div className="pointer-events-none absolute inset-x-4 top-1/2 z-10 flex -translate-y-1/2 justify-center sm:inset-x-6 lg:inset-x-8">
      <div className="pointer-events-auto rounded-lg border border-cyan-300/40 bg-gray-950/85 px-8 py-6 text-center shadow-2xl shadow-cyan-500/20">
        <p className="text-5xl font-black italic tracking-normal text-cyan-200 drop-shadow-[0_0_18px_rgba(34,211,238,0.9)]">
          {displayResult === 'WIN' && 'YOU WIN'}
          {displayResult === 'LOSE' && 'GAME OVER'}
          {displayResult === 'DRAW' && 'DRAW'}
          {displayResult === 'ERROR' && 'ERROR'}
        </p>

        {errorMessage && (
          <p className="mt-4 text-lg font-bold text-red-400">{errorMessage}</p>
        )}

        {Object.keys(safeRankings).length > 0 && (
          <div className="mt-6 w-full overflow-x-auto text-left">
            <table className="w-full text-sm text-gray-300">
              <thead className="bg-gray-800/50 text-gray-400">
                <tr>
                  <th className="px-4 py-2 font-medium">プレイヤー</th>
                  <th className="px-4 py-2 text-center font-medium">キル</th>
                  <th className="px-4 py-2 text-center font-medium">破壊</th>
                  <th className="px-4 py-2 text-center font-medium">設置</th>
                  <th className="px-4 py-2 text-right font-medium">生存時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sortedRankings.map(([playerId, stats], i) => {
                  const username =
                    players?.[playerId]?.username || playerId.slice(0, 8)
                  return (
                    <tr
                      key={playerId}
                      className={i % 2 === 0 ? 'bg-gray-900/30' : ''}
                    >
                      <td
                        className={`px-4 py-2 ${!stats.alive ? 'text-gray-500' : 'text-gray-100 font-bold'}`}
                      >
                        {username}
                        {!stats.alive && (
                          <span
                            className="ml-2 opacity-80"
                            role="img"
                            aria-label="dead"
                          >
                            ☠️
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-4 py-2 text-center ${!stats.alive && 'text-gray-500'}`}
                      >
                        {stats.kills}
                      </td>
                      <td
                        className={`px-4 py-2 text-center ${!stats.alive && 'text-gray-500'}`}
                      >
                        {stats.blocksDestroyed}
                      </td>
                      <td
                        className={`px-4 py-2 text-center ${!stats.alive && 'text-gray-500'}`}
                      >
                        {stats.bombsPlaced}
                      </td>
                      <td
                        className={`px-4 py-2 text-right ${!stats.alive && 'text-gray-500'}`}
                      >
                        {(stats.survivalTime / 1000).toFixed(1)}s
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-6 flex justify-center">
          <Button variant="primary" onClick={() => navigate('/lobby')}>
            ロビーへ戻る
          </Button>
        </div>
      </div>
    </div>
  )
}
