import type { FriendRequest } from '../../types/friend'

interface FriendRequestCardProps {
  request: FriendRequest
  onAccept: (requestId: string) => void
  onReject: (requestId: string) => void
}

/**
 * FriendRequestCard component
 * Displays a friend request with accept/reject buttons
 */
export function FriendRequestCard({
  request,
  onAccept,
  onReject,
}: FriendRequestCardProps) {
  return (
    <div className="console-panel console-panel--subtle p-4 transition-all hover:border-[#b8ff64]">
      <div className="flex items-center justify-between">
        {/* ユーザー情報 */}
        <div className="flex items-center gap-4">
          {/* アバター */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
            {request.requester.username[0].toUpperCase()}
          </div>

          {/* ユーザー名 */}
          <div>
            <p className="text-white font-semibold text-lg">
              {request.requester.username}
            </p>
            <p className="text-white/50 text-sm">{request.requester.email}</p>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex items-center gap-2">
          {/* 承認ボタン */}
          <button
            onClick={() => onAccept(request.id)}
            className="console-button px-5 py-2 text-xs"
          >
            承認
          </button>

          {/* 拒否ボタン */}
          <button
            onClick={() => onReject(request.id)}
            className="console-button console-button--danger px-5 py-2 text-xs"
          >
            拒否
          </button>
        </div>
      </div>
    </div>
  )
}
