import type { FriendStatus } from '../../types/friend'

interface OnlineStatusProps {
  status: FriendStatus
}

/**
 * OnlineStatus component
 * Displays a colored indicator based on user status
 * - online: green
 * - offline: gray
 * - in_game: purple
 */
export function OnlineStatus({ status }: OnlineStatusProps) {
  // ステータスに応じた色を決定
  const colorClass = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    in_game: 'bg-purple-500',
  }[status]

  const label = {
    online: 'オンライン',
    offline: 'オフライン',
    in_game: 'ゲーム中',
  }[status]

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${colorClass}`} />
      <span className="text-sm text-white/70">{label}</span>
    </div>
  )
}
