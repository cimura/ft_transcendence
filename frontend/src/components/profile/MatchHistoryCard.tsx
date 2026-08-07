import type { MatchHistory } from '../../types/profile'

interface MatchHistoryCardProps {
  match: MatchHistory
}

export const MatchHistoryCard = ({ match }: MatchHistoryCardProps) => {
  const resultColor =
    match.result === 'win'
      ? 'from-green-500 to-green-600'
      : match.result === 'loss'
        ? 'from-red-500 to-red-600'
        : 'from-gray-500 to-gray-600'

  const resultText =
    match.result === 'win'
      ? '勝利'
      : match.result === 'loss'
        ? '敗北'
        : '引き分け'

  const formatDate = (date: string) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}日前`
    if (hours > 0) return `${hours}時間前`
    return 'たった今'
  }

  return (
    <div className="bg-black/60 border-2 border-white/20 rounded-2xl p-4 hover:border-white/40 transition-all">
      <div className="flex items-center gap-4">
        {/* 結果アイコン */}
        <div
          className={`w-16 h-16 rounded-full bg-gradient-to-br ${resultColor}
                       flex items-center justify-center text-white font-bold text-sm`}
        >
          {resultText}
        </div>

        {/* 試合情報 */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold">{match.gameType}</h3>
            <span className="text-white/40 text-sm">
              {formatDate(match.playedAt)}
            </span>
          </div>
          <p className="text-white/60 text-sm mb-2">
            vs{' '}
            {match.opponents.length > 0
              ? match.opponents.join(', ')
              : '退会したプレイヤー'}
          </p>
          {match.kills !== undefined && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-white/80">
                キル数:{' '}
                <span className="font-semibold text-white">{match.kills}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
