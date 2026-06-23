import { useNavigate } from 'react-router-dom'
import { Button } from '../common/Button'
import type { GameEndPayload } from '../../game/bomberman/bombermanTypes'

type GameResultOverlayProps = {
  result: 'WIN' | 'LOSE' | 'DRAW' | null
  rankings: GameEndPayload['rankings']
  isDisconnected: boolean
}

export function GameResultOverlay({
  result,
  rankings,
  isDisconnected,
}: GameResultOverlayProps) {
  const navigate = useNavigate()

  if (!result) return null

  return (
    <div className="pointer-events-none absolute inset-x-4 top-1/2 z-10 flex -translate-y-1/2 justify-center sm:inset-x-6 lg:inset-x-8">
      <div className="pointer-events-auto rounded-lg border border-cyan-300/40 bg-gray-950/85 px-8 py-6 text-center shadow-2xl shadow-cyan-500/20">
        <p className="text-5xl font-black italic tracking-normal text-cyan-200 drop-shadow-[0_0_18px_rgba(34,211,238,0.9)]">
          {result === 'WIN' && 'YOU WIN'}
          {result === 'LOSE' && 'GAME OVER'}
          {result === 'DRAW' && 'DRAW'}
        </p>
        <p className="mt-4 text-sm font-semibold text-gray-300">
          {isDisconnected
            ? 'ネットワークを切断したためGAME OVERになりました。'
            : 'ロビーへ戻って再開できます'}
        </p>

        {rankings.length > 0 && (
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
                {rankings
                  .sort((a, b) => b.stats.survivalTime - a.stats.survivalTime)
                  .map((r, i) => (
                    <tr
                      key={r.playerId}
                      className={i % 2 === 0 ? 'bg-gray-900/30' : ''}
                    >
                      <td className="px-4 py-2">{r.playerId.slice(0, 8)}</td>
                      <td className="px-4 py-2 text-center">{r.stats.kills}</td>
                      <td className="px-4 py-2 text-center">
                        {r.stats.blocksDestroyed}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {r.stats.bombsPlaced}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {(r.stats.survivalTime / 1000).toFixed(1)}s
                      </td>
                    </tr>
                  ))}
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
