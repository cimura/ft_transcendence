import type { Friend } from '../../types/friend'
import { Link } from 'react-router-dom'
import { Avatar } from '../common/Avatar'

interface FriendCardProps {
  friend: Friend
  onDelete: (friend: Friend) => void
}

/**
 * FriendCard component
 * Displays a single friend's information with profile navigation and delete button
 */
export function FriendCard({ friend, onDelete }: FriendCardProps) {
  const statusLabel = {
    online: 'オンライン',
    in_game: 'ゲーム中',
    offline: 'オフライン',
  }[friend.status]

  const statusColor = {
    online: 'bg-green-400',
    in_game: 'bg-yellow-400',
    offline: 'bg-gray-500',
  }[friend.status]

  return (
    <div className="flex items-center gap-4 bg-black border-2 border-white/40 rounded-full px-6 py-4 hover:border-white/60 transition-all">
      <Link
        to={`/profile/${friend.id}`}
        state={{ from: '/friends/list' }}
        className="flex min-w-0 flex-1 items-center gap-4 rounded-full focus:outline-none focus:ring-2 focus:ring-white/60"
        aria-label={`${friend.username}のプロフィールを表示`}
      >
        {/* アバター */}
        <div className="flex-shrink-0">
          <Avatar
            avatarUrl={friend.avatarUrl}
            username={friend.username}
            className="w-12 h-12 rounded-full border-2 border-cyan-700 shadow-[0_0_10px_rgba(0,255,255,0.2)]"
            fallbackClassName="bg-cyan-950 text-cyan-300 font-bold text-xl"
          />
        </div>

        {/* ユーザー名 */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-white text-2xl font-medium">
            {friend.username}
          </p>
          <div className="mt-1 flex items-center gap-2 text-sm text-white/70">
            <span
              className={`h-2.5 w-2.5 rounded-full ${statusColor}`}
              aria-hidden="true"
            />
            <span>{statusLabel}</span>
          </div>
        </div>
      </Link>

      {/* 削除ボタン */}
      <button
        onClick={() => onDelete(friend)}
        className="flex-shrink-0 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all border-2 border-white/20 hover:border-white/40"
      >
        {/* ゴミ箱アイコン（SVG） */}
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  )
}
