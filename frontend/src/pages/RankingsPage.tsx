import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRankings } from '../api/stats'
import type { RankingItem } from '../types/profile'

/**
 * Displays the rankings list and provides navigation to the home and player profile pages.
 */

const RANKING_GRID_COLS =
  'grid-cols-[52px_minmax(0,1fr)_76px] sm:grid-cols-[64px_minmax(0,1fr)_88px_88px_88px]'
export function RankingsPage() {
  const navigate = useNavigate()
  const [rankings, setRankings] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    const fetchRankings = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await getRankings(20)
        if (!ignore) setRankings(response.data)
      } catch (err) {
        if (!ignore) {
          setError(
            err instanceof Error
              ? err.message
              : 'ランキングの取得に失敗しました'
          )
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    fetchRankings()

    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 text-cyan-100 relative flex justify-center">
      <div className="w-full max-w-4xl relative z-10 mt-4">
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate('/home')}
            className="rounded-full border border-cyan-500/50 bg-black/40 backdrop-blur-md px-6 py-2 text-cyan-100 transition-all hover:border-cyan-300 hover:bg-cyan-900/50 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)]"
          >
            &lt; 戻る
          </button>
          <h1 className="text-3xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_10px_rgba(0,255,255,0.3)]">
            ランキング
          </h1>
          <div className="w-24" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-cyan-500/30 bg-black/50 backdrop-blur-md shadow-[0_0_20px_rgba(0,255,255,0.1)]">
          {/* ヘッダー行 */}
          <div
            className={`grid ${RANKING_GRID_COLS} gap-3 border-b border-cyan-500/30 bg-black/40 px-4 py-4 text-sm font-bold text-cyan-300/80 sm:px-5`}
          >
            <span>順位</span>
            <span>プレイヤー</span>
            <span className="text-right">ポイント</span>
            <span className="hidden text-right sm:block">勝率</span>
            <span className="hidden text-right sm:block">キル</span>
          </div>

          {loading && (
            <div className="px-5 py-10 text-center text-cyan-100/60 animate-pulse">
              スキャン中...
            </div>
          )}

          {!loading && error && (
            <div className="px-5 py-10 text-center text-red-400">{error}</div>
          )}

          {!loading && !error && rankings.length === 0 && (
            <div className="px-5 py-10 text-center text-cyan-100/60">
              ランキングデータがありません
            </div>
          )}

          {!loading &&
            !error &&
            rankings.map((item) => (
              <button
                key={item.userId}
                onClick={() => navigate(`/profile/${item.userId}`)}
                className={`grid w-full ${RANKING_GRID_COLS} items-center gap-3 border-b border-cyan-900/50 px-4 py-4 text-left transition-all duration-300 last:border-b-0 hover:bg-cyan-900/30 hover:shadow-[inset_0_0_20px_rgba(0,255,255,0.15)] sm:px-5 group`}
              >
                {/* 順位をネオンカラーに */}
                <span className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.6)] group-hover:text-white transition-colors">
                  #{item.rank}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold text-cyan-50 group-hover:text-cyan-200">
                    {item.displayName ?? item.username}
                  </span>
                  <span className="block truncate text-sm text-cyan-100/50">
                    {item.totalGames}戦 {item.wins}勝 {item.losses}敗{' '}
                    {item.draws}分
                  </span>
                </span>
                <span className="text-right font-bold text-cyan-200">
                  {item.points}
                </span>
                <span className="hidden text-right sm:block text-cyan-100/80">
                  {item.winRate}%
                </span>
                <span className="hidden text-right sm:block text-cyan-100/80">
                  {item.kills}
                </span>
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}
