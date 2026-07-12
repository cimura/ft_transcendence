import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRankings } from '../api/stats'
import type { RankingItem } from '../types/profile'

/**
 * Displays the rankings list and provides navigation to the home and player profile pages.
 */
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
    <div className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/home')}
            className="rounded-full border-2 border-white/20 bg-black/50 px-6 py-3 text-white transition-all hover:border-white/40"
          >
            戻る
          </button>
          <h1 className="text-3xl font-bold">ランキング</h1>
          <div className="w-24" />
        </div>

        <div className="overflow-hidden rounded-2xl border-2 border-white/20 bg-black/80">
          <div className="grid grid-cols-[52px_minmax(0,1fr)_76px] gap-3 border-b border-white/10 px-4 py-4 text-sm font-semibold text-white/60 sm:grid-cols-[64px_minmax(0,1fr)_88px_88px_88px] sm:px-5">
            <span>順位</span>
            <span>プレイヤー</span>
            <span className="text-right">ポイント</span>
            <span className="hidden text-right sm:block">勝率</span>
            <span className="hidden text-right sm:block">キル</span>
          </div>

          {loading && (
            <div className="px-5 py-10 text-center text-white/60">
              読み込み中...
            </div>
          )}

          {!loading && error && (
            <div className="px-5 py-10 text-center text-red-300">{error}</div>
          )}

          {!loading && !error && rankings.length === 0 && (
            <div className="px-5 py-10 text-center text-white/60">
              ランキングデータがありません
            </div>
          )}

          {!loading &&
            !error &&
            rankings.map((item) => (
              <button
                key={item.userId}
                onClick={() => navigate(`/profile/${item.userId}`)}
                className="grid w-full grid-cols-[52px_minmax(0,1fr)_76px] items-center gap-3 border-b border-white/10 px-4 py-4 text-left transition-all last:border-b-0 hover:bg-white/5 sm:grid-cols-[64px_minmax(0,1fr)_88px_88px_88px] sm:px-5"
              >
                <span className="text-xl font-bold">#{item.rank}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {item.displayName ?? item.username}
                  </span>
                  <span className="block truncate text-sm text-white/50">
                    {item.totalGames}戦 {item.wins}勝 {item.losses}敗{' '}
                    {item.draws}分
                  </span>
                </span>
                <span className="text-right font-semibold">{item.points}</span>
                <span className="hidden text-right sm:block">
                  {item.winRate}%
                </span>
                <span className="hidden text-right sm:block">{item.kills}</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}
