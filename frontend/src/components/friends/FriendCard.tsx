import type { Friend } from '../../types/friend'

interface FriendCardProps {
  friend: Friend
  onDelete: (friend: Friend) => void
}

/**
 * FriendCard component
 * Displays a single friend's information with online status and delete button
 */
export function FriendCard({ friend, onDelete }: FriendCardProps) {
  return (
    <div className="console-panel console-panel--subtle flex items-center gap-4 px-5 py-4 transition-all hover:border-[#b8ff64]">
      {/* アバター */}
      <div className="flex-shrink-0">
        {friend.avatarUrl ? (
          <img
            src={friend.avatarUrl}
            alt={friend.username}
            className="w-12 h-12 rounded-full"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <span className="text-2xl">🐦</span>
          </div>
        )}
      </div>

      {/* ユーザー名 */}
      <div className="flex-1">
        <p className="text-lg font-medium text-white">{friend.username}</p>
      </div>

      {/* オンラインステータス */}
      <div className="flex-shrink-0">
        {friend.status === 'online' && (
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
        )}
        {friend.status === 'offline' && (
          <div className="w-3 h-3 bg-gray-400 rounded-full" />
        )}
        {friend.status === 'in_game' && (
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
        )}
      </div>

      {/* 削除ボタン */}
      <button
        onClick={() => onDelete(friend)}
        className="console-button console-button--muted flex h-10 w-10 flex-shrink-0 items-center justify-center p-0"
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
