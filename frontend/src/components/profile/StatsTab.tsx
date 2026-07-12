import { useStats } from '../../hooks/useStats'

interface StatsTabProps {
  userId: string
}

export const StatsTab = ({ userId }: StatsTabProps) => {
  const { stats, loading, error } = useStats(userId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/60">統計を読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-500">エラー: {error}</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/60">統計データがありません</div>
      </div>
    )
  }

  const statCards = [
    {
      label: '総試合数',
      value: stats.totalGames,
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: '勝利数',
      value: stats.wins,
      color: 'from-green-500 to-green-600',
    },
    { label: '敗北数', value: stats.losses, color: 'from-red-500 to-red-600' },
    {
      label: '引き分け',
      value: stats.draws,
      color: 'from-gray-500 to-gray-600',
    },
    {
      label: '勝率',
      value: `${stats.winRate.toFixed(1)}%`,
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      label: '総キル数',
      value: stats.kills,
      color: 'from-purple-500 to-purple-600',
    },
  ]

  if (stats.maxWinStreak !== undefined && stats.maxWinStreak > 0) {
    statCards.push({
      label: '最大連勝',
      value: stats.maxWinStreak,
      color: 'from-orange-500 to-orange-600',
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      {statCards.map((card, index) => (
        <div
          key={index}
          className="console-panel console-panel--subtle p-6 transition-all hover:border-[#b8ff64]"
        >
          <div
            className={`w-12 h-12 rounded-full bg-gradient-to-br ${card.color}
                         flex items-center justify-center mb-4`}
          >
            <span className="text-white font-bold text-lg">
              {typeof card.value === 'number'
                ? card.value.toString().charAt(0)
                : card.value.charAt(0)}
            </span>
          </div>
          <h3 className="text-white/60 text-sm mb-2">{card.label}</h3>
          <p className="text-white text-3xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
